/**
 * Fazumi Worker (Phase 4 — real OpenAI summaries + cost controls + reliability)
 *
 * Core behavior:
 * - Dequeues inbound events from Supabase (RPC: dequeue_inbound_event_json)
 * - WhatsApp inbound text:
 *    - Commands: HELP / STOP / START / STATUS / PAY / DELETE
 *    - Paywall: 3 free MEANINGFUL summaries per user (BEFORE any OpenAI call)
 *    - DRY_RUN toggle: if DRY_RUN=true => synthetic summary, else real OpenAI
 * - SAFETY:
 *    - Dedupe is DB-first (provider_event_id/wa_message_id unique at insert layer)
 *    - Increment free usage ONLY after successful WhatsApp send
 *    - PII-safe logs (no message content)
 */

"use strict";

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

// OpenAI summarizer module (must be CommonJS export in src/openai_summarizer.js)
let openaiSummarize = null;
try {
  ({ openaiSummarize } = require("./openai_summarizer"));
} catch (e) {
  // OK if DRY_RUN=true; we will error if DRY_RUN=false and module missing
  openaiSummarize = null;
}

// -------------------- ENV --------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const D360_BASE_URL = process.env.D360_BASE_URL || "https://waba-v2.360dialog.io";
const D360_API_KEY = process.env.D360_API_KEY || "";

const LEMON_CHECKOUT_URL = process.env.LEMON_CHECKOUT_URL || "";

const DRY_RUN = String(process.env.DRY_RUN || "true").toLowerCase() !== "false";
console.log("[worker] env DRY_RUN raw =", JSON.stringify(process.env.DRY_RUN));
console.log("[worker] computed DRY_RUN =", DRY_RUN);

if (typeof fetch !== "function") {
  console.error("[worker] fetch() not available. Please upgrade Node to v18+.");
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[worker] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

if (!DRY_RUN && typeof openaiSummarize !== "function") {
  console.error("[worker] DRY_RUN=false but openai_summarizer.js is not loadable.");
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

// -------------------- Simple concurrency gate --------------------
const MAX_CONCURRENCY = Math.max(1, Number(process.env.OPENAI_CONCURRENCY || 2));
let inFlight = 0;

async function withConcurrency(fn) {
  while (inFlight >= MAX_CONCURRENCY) {
    await sleep(50);
  }
  inFlight++;
  try {
    return await fn();
  } finally {
    inFlight--;
  }
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
/**
 * Robust extraction:
 * - Use normalized columns when present (from_phone / wa_message_id / user_msg_ts)
 * - Fall back to meta
 * - Accept text from either meta.text_body or Meta-style meta.text.body
 */
function extractTextAndSender(eventRow) {
  const wa_number =
    eventRow.from_phone ||
    eventRow.wa_number ||
    eventRow.meta?.from_phone ||
    null;

  const msg_type =
    eventRow.meta?.msg_type ||
    eventRow.meta?.type ||
    null;

  const text_body =
    (eventRow.meta?.text_body ||
      eventRow.meta?.text?.body ||
      "").trim();

  if (!wa_number) return null;

  // only actionable: inbound user text-like messages
  const isTextLike = msg_type === "text" || msg_type === "interactive" || msg_type === "button";
  if (!isTextLike) return null;

  if (!text_body) return null;

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
      free_remaining: settings?.free_limit ?? 3,
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

// -------------------- WhatsApp send (360dialog) --------------------
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

function buildHelpMessage() {
  return [
    "Fazumi HELP",
    "Send a message and I’ll summarize it.",
    "",
    "Commands:",
    "STATUS - show your plan and remaining usage",
    "PAY - upgrade",
    "STOP - pause summaries",
    "START - resume summaries",
    "DELETE - delete your data",
  ].join("\n");
}

function buildStatusMessage(user) {
  return [
    "Fazumi STATUS",
    `Plan: ${user.plan}`,
    `Blocked: ${user.is_blocked ? "YES" : "NO"}`,
    user.plan === "free" ? `Free remaining: ${user.free_remaining}` : "Free remaining: N/A",
  ].join("\n");
}

// -------------------- OpenAI summary wrapper --------------------
async function generateSummaryOrDryRun(inputText) {
  const capped = String(inputText || "").slice(0, Number(process.env.OPENAI_MAX_INPUT_CHARS || 6000));

  if (DRY_RUN) {
    return {
      ok: true,
      summary_text: `(DRY RUN) Summary would be generated for:\n${capped.slice(0, 200)}`,
      openai_model: null,
      input_tokens: null,
      output_tokens: null,
      total_tokens: null,
      cost_usd_est: null,
      error_code: null,
    };
  }

  // Real OpenAI call (with concurrency cap)
  return await withConcurrency(async () => {
    return await openaiSummarize({ inputText: capped });
  });
}

// -------------------- WhatsApp processing --------------------
async function processWhatsAppEvent(eventRow) {
  const parsed = extractTextAndSender(eventRow);
  if (!parsed) return { action: "skip_not_actionable" };

  let user = await resolveUser(parsed.wa_number);
  await updateLastUserMessageAt(parsed.wa_number);

  const normalized = normalizeInboundText(parsed.text_body);

  // HELP
  if (normalized === "HELP") {
    await sendWhatsAppText(parsed.wa_number, buildHelpMessage());
    return { action: "help" };
  }

  // STATUS
  if (normalized === "STATUS") {
    await sendWhatsAppText(parsed.wa_number, buildStatusMessage(user));
    return { action: "status" };
  }

  // PAY
  if (normalized === "PAY") {
    const url = buildLemonCheckoutUrl(parsed.wa_number);
    await sendWhatsAppText(parsed.wa_number, `Upgrade here:\n${url}`);
    return { action: "pay_link" };
  }

  // STOP/START
  if (normalized === "STOP") {
    await supabase
      .from("users")
      .update({ is_blocked: true, blocked_at: nowIso(), updated_at: nowIso() })
      .eq("phone_e164", parsed.wa_number);
    await setPendingNotice(parsed.wa_number, "blocked");
    await sendWhatsAppText(parsed.wa_number, "⛔ Summaries paused. Reply START to resume.");
    return { action: "stop" };
  }

  if (normalized === "START") {
    await supabase
      .from("users")
      .update({ is_blocked: false, blocked_at: null, updated_at: nowIso() })
      .eq("phone_e164", parsed.wa_number);
    await sendWhatsAppText(parsed.wa_number, "✅ Summaries resumed.");
    return { action: "start" };
  }

  // DELETE (minimal)
  if (normalized === "DELETE") {
    await supabase
      .from("users")
      .update({ deleted_at: nowIso(), status: "deleted", updated_at: nowIso() })
      .eq("phone_e164", parsed.wa_number);
    await sendWhatsAppText(parsed.wa_number, "✅ Your data is marked for deletion.");
    return { action: "delete" };
  }

  // BLOCKED users: only commands allowed
  if (user.is_blocked) {
    await setPendingNotice(parsed.wa_number, "blocked");
    await sendWhatsAppText(parsed.wa_number, "⛔ Summaries paused. Reply START.");
    return { action: "blocked_notice" };
  }

  const meaningful = isMeaningfulText(parsed.text_body);

  // PAYWALL — MUST happen BEFORE any OpenAI call
  if (user.plan === "free" && meaningful && Number(user.free_remaining || 0) <= 0) {
    await setPendingNotice(parsed.wa_number, "paywall");
    await sendWhatsAppText(parsed.wa_number, "You’ve used your free summaries.\nReply PAY to upgrade.");
    return { action: "paywall" };
  }

  // REAL SUMMARY (or dry run)
  const result = await generateSummaryOrDryRun(parsed.text_body);

  if (!result.ok) {
    await sendWhatsAppText(parsed.wa_number, "⚠️ Sorry—summarizer is temporarily busy. Try again.");
    return { action: "summary_failed" };
  }

  // Send reply first
  await sendWhatsAppText(parsed.wa_number, result.summary_text);

  // Store summary record (best-effort)
  const insertSummary = {
    wa_number: parsed.wa_number,
    input_chars: parsed.text_body.length,
    summary_text: result.summary_text,
    openai_model: result.openai_model || null,
    input_tokens: result.input_tokens ?? null,
    output_tokens: result.output_tokens ?? null,
    total_tokens: result.total_tokens ?? null,
    cost_usd_est: result.cost_usd_est ?? null,
    error_code: result.error_code ?? null,
  };

  await supabase.from("summaries").insert(insertSummary);

  // Decrement free usage ONLY after successful WhatsApp send
  if (meaningful && user.plan === "free") {
    await supabase
      .from("users")
      .update({
        free_remaining: Math.max(Number(user.free_remaining || 0) - 1, 0),
        free_used: Number(user.free_used || 0) + 1,
        updated_at: nowIso(),
      })
      .eq("phone_e164", parsed.wa_number);
  }

  return { action: "summarized", dry_run: DRY_RUN };
}

// -------------------- worker loop --------------------
async function runOnce() {
  const eventRow = await dequeueEventJson();
  if (!eventRow) return false;

  const evId = eventRow.id;
  const provider = eventRow.provider || "unknown";
  const phone = eventRow.from_phone || eventRow.wa_number || eventRow.meta?.from_phone || null;

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
          `[worker] whatsapp id=${evId} cmd=${isCmd ? normalized : "NO"} meaningful=${isMeaningfulText(parsed.text_body)} dry_run=${DRY_RUN}`
        );

        const result = await processWhatsAppEvent(eventRow);
        console.log(`[worker] processed id=${evId} action=${result.action}`);
      }
    } else {
      console.log(`[worker] provider=${provider} id=${evId} (ignored)`);
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
