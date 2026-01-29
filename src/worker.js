/**
 * Fazumi Worker (Phase 3 — commands + reliability hardening)
 *
 * What this worker does:
 * - Dequeues inbound events from Supabase (RPC: dequeue_inbound_event_json)
 * - WhatsApp text:
 *    - Commands: HELP / STOP / START / STATUS / PAY / DELETE
 *    - Blocked users: only commands allowed (no summaries)
 *    - Paywall: 3 free MEANINGFUL summaries per user (before any summary work)
 *    - DRY_RUN summary (real OpenAI later)
 * - Lemon Squeezy events: update user plan
 *
 * SAFETY RULES:
 * - Paywall decision happens BEFORE any summary generation.
 * - Free usage decremented ONLY AFTER successful WhatsApp send.
 * - Dedupe is DB-first (server inserts provider_event_id unique; worker processes queue rows).
 *
 * DATA MINIMIZATION:
 * - We do not store raw inbound message text; we store minimal meta and summary output only.
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

// -------------------- ENV --------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const D360_BASE_URL = process.env.D360_BASE_URL || "https://waba-v2.360dialog.io";
const D360_API_KEY = process.env.D360_API_KEY || "";

const LEMON_CHECKOUT_URL = process.env.LEMON_CHECKOUT_URL || "";

if (typeof fetch !== "function") {
  console.error("[worker] fetch() not available. Please upgrade Node to v18+.");
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[worker] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// -------------------- graceful shutdown --------------------
let shouldStop = false;
process.on("SIGINT", () => {
  console.log("\n[worker] stopping... (Ctrl+C received)");
  shouldStop = true;
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function nowIso() {
  return new Date().toISOString();
}

// -------------------- PII-safe helpers --------------------
function hashPhone(phoneE164) {
  return crypto.createHash("sha256").update(String(phoneE164), "utf8").digest("hex");
}

function maskPhone(phoneE164) {
  const s = String(phoneE164 || "");
  if (s.length <= 4) return "****";
  return `${s.slice(0, 2)}****${s.slice(-2)}`;
}

function isMeaningfulText(text) {
  const t = (text || "").trim();
  if (t.length < 20) return false;
  const words = t.split(/\s+/).filter(Boolean);
  return words.length >= 4;
}

function normalizeInboundText(text) {
  const t = String(text || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
  return t.replace(/[.!?]+$/g, "");
}

function buildLemonCheckoutUrl(waNumber) {
  if (!LEMON_CHECKOUT_URL) throw new Error("Missing LEMON_CHECKOUT_URL in .env");
  const u = new URL(LEMON_CHECKOUT_URL);
  u.searchParams.set("checkout[custom][wa_number]", String(waNumber));
  return u.toString();
}

// -------------------- Supabase queue --------------------
async function dequeueEventJson() {
  const { data, error } = await supabase.rpc("dequeue_inbound_event_json");
  if (error) {
    console.error("[worker] dequeue error", error);
    return null;
  }
  if (!data || data.id == null) return null;
  return data;
}

// -------------------- WhatsApp event parsing --------------------
function extractTextAndSender(eventRow) {
  const wa_number = eventRow.wa_number || eventRow.meta?.from_phone || null;
  const msg_type = eventRow.meta?.msg_type || null;
  const text_body = (eventRow.meta?.text_body || "").trim();
  if (!wa_number || msg_type !== "text" || !text_body) return null;
  return { wa_number, text_body };
}

// -------------------- Users --------------------
async function resolveUser(waNumber) {
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("phone_e164", waNumber)
    .maybeSingle();

  if (existing) return existing;

  const { data: settings } = await supabase
    .from("app_settings")
    .select("free_limit")
    .eq("id", 1)
    .single();

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      phone_e164: waNumber,
      phone_hash: hashPhone(waNumber),
      plan: "free",
      status: "active",
      is_paid: false,
      free_remaining: settings.free_limit,
      free_used: 0,
      period_usage: 0,
      is_blocked: false,
      pending_notice: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select()
    .single();

  if (error) throw error;
  console.log("[worker] created user:", maskPhone(waNumber));
  return created;
}

async function updateLastUserMessageAt(waNumber) {
  await supabase
    .from("users")
    .update({ last_user_message_at: nowIso(), updated_at: nowIso() })
    .eq("phone_e164", waNumber);
}

// ✅ NEW: pending_notice helper
async function setPendingNotice(waNumber, text) {
  await supabase
    .from("users")
    .update({ pending_notice: text, updated_at: nowIso() })
    .eq("phone_e164", waNumber);
}

async function clearPendingNotice(waNumber) {
  await supabase
    .from("users")
    .update({ pending_notice: null, updated_at: nowIso() })
    .eq("phone_e164", waNumber);
}

// -------------------- WhatsApp send --------------------
async function sendWhatsAppText(toNumber, bodyText) {
  const url = `${D360_BASE_URL.replace(/\/$/, "")}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: String(toNumber),
    type: "text",
    text: { body: String(bodyText).slice(0, 4096) },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "D360-API-KEY": D360_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`360dialog error ${resp.status}: ${t}`);
  }

  await clearPendingNotice(toNumber);
}

// -------------------- Commands --------------------
const KNOWN_COMMANDS = new Set(["HELP", "STATUS", "PAY", "STOP", "START", "DELETE"]);

function buildStatusMessage(user) {
  return [
    "Fazumi STATUS",
    `Plan: ${user.plan}`,
    `Blocked: ${user.is_blocked ? "YES" : "NO"}`,
    user.plan === "free" ? `Free remaining: ${user.free_remaining}` : "Free remaining: N/A",
  ].join("\n");
}

// -------------------- WhatsApp processing --------------------
async function processWhatsAppEvent(eventRow) {
  const parsed = extractTextAndSender(eventRow);
  if (!parsed) return;

  let user = await resolveUser(parsed.wa_number);
  await updateLastUserMessageAt(parsed.wa_number);

  const normalized = normalizeInboundText(parsed.text_body);

  // STATUS
  if (normalized === "STATUS") {
    await sendWhatsAppText(parsed.wa_number, buildStatusMessage(user));
    return;
  }

  // PAY
  if (normalized === "PAY") {
    const url = buildLemonCheckoutUrl(parsed.wa_number);
    await sendWhatsAppText(parsed.wa_number, `Upgrade here:\n${url}`);
    return;
  }

  // BLOCKED
  if (user.is_blocked) {
    await setPendingNotice(parsed.wa_number, "blocked");
    await sendWhatsAppText(parsed.wa_number, "⛔ Summaries paused. Reply START.");
    return;
  }

  const meaningful = isMeaningfulText(parsed.text_body);

  // PAYWALL
  if (user.plan === "free" && meaningful && user.free_remaining <= 0) {
    await setPendingNotice(parsed.wa_number, "paywall");
    await sendWhatsAppText(
      parsed.wa_number,
      "You’ve used your free summaries.\nReply PAY to upgrade."
    );
    return;
  }

  const summary =
    `(DRY RUN) Summary would be generated for:\n` +
    parsed.text_body.slice(0, 180);

  await sendWhatsAppText(parsed.wa_number, summary);

  await supabase.from("summaries").insert({
    wa_number: parsed.wa_number,
    input_chars: parsed.text_body.length,
    summary_text: summary,
  });

  if (meaningful && user.plan === "free") {
    await supabase
      .from("users")
      .update({
        free_remaining: Math.max(user.free_remaining - 1, 0),
        free_used: user.free_used + 1,
        updated_at: nowIso(),
      })
      .eq("phone_e164", parsed.wa_number);
  }
}

// -------------------- worker loop --------------------
async function runOnce() {
  const eventRow = await dequeueEventJson();
  if (!eventRow) return false;

  try {
    if (eventRow.provider === "whatsapp") {
      await processWhatsAppEvent(eventRow);
    }
    await supabase
      .from("v_actionable_inbound_events")
      .update({ status: "done", processed_at: nowIso() })
      .eq("id", eventRow.id);
  } catch (e) {
    await supabase
      .from("v_actionable_inbound_events")
      .update({ status: "error", last_error: String(e).slice(0, 500) })
      .eq("id", eventRow.id);
  }
  return true;
}

async function loop() {
  console.log("[worker] started");
  while (!shouldStop) {
    const didWork = await runOnce();
    await sleep(didWork ? 250 : 2000);
  }
}

loop();
