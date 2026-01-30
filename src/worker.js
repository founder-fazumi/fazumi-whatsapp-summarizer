/**
 * Fazumi Worker (Phase 4 — OpenAI summaries + cost controls foundation)
 *
 * What this worker does:
 * - Dequeues inbound events from Supabase (RPC: dequeue_inbound_event_json)
 * - Processes WhatsApp TEXT:
 *    - Commands: HELP / STOP / START / STATUS / PAY / DELETE
 *    - Blocked users: only commands allowed (no summaries)
 *    - Paywall: 3 free MEANINGFUL summaries per user (BEFORE any OpenAI call)
 *    - DRY_RUN=true => no OpenAI calls
 *    - DRY_RUN=false => real OpenAI call via src/openai_summarizer.js
 * - Stores minimal summary audit in summaries: tokens + cost estimate + model + error_code (no raw input stored)
 *
 * SAFETY RULES (MANDATORY):
 * - Paywall decision happens BEFORE any OpenAI call.
 * - Free usage decremented ONLY AFTER successful WhatsApp send.
 * - Dedupe is DB-first (unique provider msg id in DB; worker processes queue rows).
 *
 * DATA MINIMIZATION:
 * - Do not store raw inbound message text in DB.
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const { summarizeText } = require("./openai_summarizer");

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

// -------------------- WhatsApp event parsing (REWRITTEN) --------------------
function extractTextAndSender(eventRow) {
  // Prefer view-provided normalized fields, then fallback to meta.
  const wa_number =
    eventRow.from_phone_effective ||
    eventRow.from_phone ||
    eventRow.wa_number ||
    eventRow.meta?.from_phone ||
    null;

  // Do NOT require msg_type. Your meta often has msg_type null.
  const text_body = String(eventRow.meta?.text_body || "").trim();

  // eventRow.user_msg_ts may exist (preferred). Otherwise meta.timestamp is a string.
  const user_msg_ts =
    eventRow.user_msg_ts ||
    null; // keep as-is; timestamp parsing is handled in DB already

  if (!wa_number || !text_body) return null;
  return { wa_number, text_body, user_msg_ts };
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

// REWRITTEN: prefer event timestamp if provided
async function updateLastUserMessageAt(waNumber, userMsgTsIsoOrNull) {
  const value = userMsgTsIsoOrNull ? String(userMsgTsIsoOrNull) : nowIso();
  await supabase
    .from("users")
    .update({ last_user_message_at: value, updated_at: nowIso() })
    .eq("phone_e164", waNumber);
}

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

// -------------------- Summary audit insert (minimal) --------------------
async function insertSummaryAudit({
  wa_number,
  summary_text,
  input_chars,
  openai_model,
  usage,
  cost_usd_est,
  error_code,
}) {
  // Minimal fields; your summaries table may differ. If insert errors, it won't block sending.
  try {
    await supabase.from("summaries").insert({
      wa_number,
      input_chars,
      summary_text,
      openai_model: openai_model || null,
      input_tokens: usage?.input_tokens ?? null,
      output_tokens: usage?.output_tokens ?? null,
      total_tokens: usage?.total_tokens ?? null,
      cost_usd_est: cost_usd_est ?? null,
      error_code: error_code || null,
      created_at: nowIso(),
    });
  } catch (e) {
    console.warn("[worker] summaries insert failed (non-fatal):", String(e).slice(0, 200));
  }
}

// -------------------- WhatsApp processing --------------------
async function processWhatsAppEvent(eventRow) {
  const parsed = extractTextAndSender(eventRow);
  if (!parsed) return;

  let user = await resolveUser(parsed.wa_number);

  // Update last_user_message_at using event timestamp if available
  await updateLastUserMessageAt(parsed.wa_number, parsed.user_msg_ts);

  const normalized = normalizeInboundText(parsed.text_body);

  // HELP
  if (normalized === "HELP") {
    await sendWhatsAppText(
      parsed.wa_number,
      "Fazumi commands:\nHELP\nSTATUS\nPAY\nSTOP\nSTART\nDELETE\n\nSend any message to summarize."
    );
    return;
  }

  // STATUS
  if (normalized === "STATUS") {
    await sendWhatsAppText(parsed.wa_number, buildStatusMessage(user));
    return;
  }

  // STOP
  if (normalized === "STOP") {
    await supabase
      .from("users")
      .update({ is_blocked: true, updated_at: nowIso() })
      .eq("phone_e164", parsed.wa_number);
    await setPendingNotice(parsed.wa_number, "blocked");
    await sendWhatsAppText(parsed.wa_number, "⛔ Summaries paused. Reply START to resume.");
    return;
  }

  // START
  if (normalized === "START") {
    await supabase
      .from("users")
      .update({ is_blocked: false, updated_at: nowIso() })
      .eq("phone_e164", parsed.wa_number);
    await sendWhatsAppText(parsed.wa_number, "✅ Summaries resumed. Send a message anytime.");
    return;
  }

  // DELETE (minimal: mark deleted_at, block, and confirm)
  if (normalized === "DELETE") {
    await supabase
      .from("users")
      .update({ deleted_at: nowIso(), is_blocked: true, updated_at: nowIso() })
      .eq("phone_e164", parsed.wa_number);
    await sendWhatsAppText(parsed.wa_number, "✅ Your data has been marked for deletion.");
    return;
  }

  // PAY
  if (normalized === "PAY") {
    const url = buildLemonCheckoutUrl(parsed.wa_number);
    await sendWhatsAppText(parsed.wa_number, `Upgrade here:\n${url}`);
    return;
  }

  // BLOCKED (no summaries)
  if (user.is_blocked) {
    await setPendingNotice(parsed.wa_number, "blocked");
    await sendWhatsAppText(parsed.wa_number, "⛔ Summaries paused. Reply START.");
    return;
  }

  const meaningful = isMeaningfulText(parsed.text_body);

  // PAYWALL (MUST happen before OpenAI)
  if (user.plan === "free" && meaningful && user.free_remaining <= 0) {
    await setPendingNotice(parsed.wa_number, "paywall");
    await sendWhatsAppText(
      parsed.wa_number,
      "You’ve used your free summaries.\nReply PAY to upgrade."
    );
    return;
  }

  // -------------------- REAL SUMMARY (DRY_RUN-safe) --------------------
  // Paywall check already passed; now it is allowed to call OpenAI (if DRY_RUN=false).
  let summaryText = null;
  let usage = null;
  let costUsdEst = null;
  let errorCode = null;
  const openaiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  try {
    const res = await summarizeText({ text: parsed.text_body });
    summaryText = res.summaryText;
    usage = res.usage || null;
    costUsdEst = res.cost_usd_est ?? null;
  } catch (e) {
    errorCode = "openai_error";
    summaryText = "Sorry — I couldn’t summarize that right now. Please try again.";
    console.warn("[worker] OpenAI summarize failed:", String(e).slice(0, 200));
  }

  // Send WhatsApp reply (ONLY after send succeeds do we decrement free)
  await sendWhatsAppText(parsed.wa_number, summaryText);

  // Store summary audit (minimal)
  await insertSummaryAudit({
    wa_number: parsed.wa_number,
    summary_text: summaryText,
    input_chars: parsed.text_body.length,
    openai_model: openaiModel,
    usage,
    cost_usd_est: costUsdEst,
    error_code: errorCode,
  });

  // Decrement free usage ONLY after WhatsApp send success
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

// -------------------- mark queue row (REWRITTEN: update base table, not view) --------------------
async function markEventDone(id) {
  await supabase
    .from("inbound_events")
    .update({ status: "done", processed_at: nowIso() })
    .eq("id", id);
}

async function markEventError(id, err) {
  await supabase
    .from("inbound_events")
    .update({ status: "error", last_error: String(err).slice(0, 500) })
    .eq("id", id);
}

// -------------------- worker loop --------------------
async function runOnce() {
  const eventRow = await dequeueEventJson();
  if (!eventRow) return false;

  const evId = eventRow.id;
  const provider = eventRow.provider || "unknown";
  const phone = eventRow.wa_number || eventRow.meta?.from_phone || null;

  console.log(`[worker] dequeued id=${evId} provider=${provider} phone=${maskPhone(phone)}`);

  const startedAt = Date.now();

  try {
    if (provider === "whatsapp") {
      const parsed = extractTextAndSender(eventRow);

      if (!parsed) {
        console.log(`[worker] skip id=${evId} not-actionable`);
      } else {
        const normalized = normalizeInboundText(parsed.text_body);
        const isCmd = KNOWN_COMMANDS.has(normalized);

        console.log(
          `[worker] whatsapp id=${evId} cmd=${isCmd ? normalized : "NO"} meaningful=${isMeaningfulText(parsed.text_body)}`
        );

        await processWhatsAppEvent(eventRow);
        console.log(`[worker] processed id=${evId} ok`);
      }
    } else if (provider === "lemonsqueezy") {
      console.log(`[worker] lemonsqueezy id=${evId} (worker may handle later)`);
    } else {
      console.log(`[worker] unknown provider id=${evId}, skipping`);
    }

    await supabase
      .from("inbound_events")
      .update({ status: "done", processed_at: nowIso(), last_error: null })
      .eq("id", evId);

    console.log(`[worker] done id=${evId} ms=${Date.now() - startedAt}`);
  } catch (e) {
    const msg = String(e?.message || e).slice(0, 300);
    console.log(`[worker] error id=${evId} ms=${Date.now() - startedAt} err=${msg}`);

    await supabase
      .from("inbound_events")
      .update({ status: "error", last_error: msg, processed_at: nowIso() })
      .eq("id", evId);
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
