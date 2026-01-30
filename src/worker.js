/**
 * Fazumi Worker (Phase 5 — SG3 24h gate + reliability hardening)
 *
 * Key Phase 5 upgrades:
 * - SG3: Strict 24-hour gate enforced BEFORE OpenAI:
 *     if now - (event.user_msg_ts || user.last_user_message_at) > 24h
 *       => send approved template only, NO OpenAI, NO free decrement
 * - Prevent duplicate WhatsApp sends:
 *     once a WhatsApp message is successfully sent, never throw afterwards
 *     (post-send DB writes are best-effort)
 * - last_user_message_at updated ONLY for actionable inbound messages (already true)
 */

"use strict";

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

// ---- OpenAI summarizer (CommonJS) ----
let summarizeText = null;
try {
  ({ summarizeText } = require("./openai_summarizer"));
} catch (e) {
  summarizeText = null; // ok if DRY_RUN=true
}

// -------------------- ENV --------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const D360_BASE_URL = process.env.D360_BASE_URL || "https://waba-v2.360dialog.io";
const D360_API_KEY = process.env.D360_API_KEY || "";

// SG3 / templates
const D360_TEMPLATE_LANG = process.env.D360_TEMPLATE_LANG || "en";
const HELLO_TEMPLATE_NAME = process.env.HELLO_TEMPLATE_NAME || "hello_fazumi";
const WHATSAPP_WINDOW_HOURS = Number(process.env.WHATSAPP_WINDOW_HOURS || 24);

// Payments
const LEMON_CHECKOUT_URL = process.env.LEMON_CHECKOUT_URL || "";

// Runtime controls
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
if (!D360_API_KEY) {
  console.error("[worker] Missing D360_API_KEY in .env");
  process.exit(1);
}
if (!DRY_RUN && typeof summarizeText !== "function") {
  console.error("[worker] DRY_RUN=false but src/openai_summarizer.js is not loadable.");
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
function safeIso(input) {
  // Returns ISO string or null
  if (!input) return null;
  try {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
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
  const t = String(text || "").trim().replace(/\s+/g, " ").toUpperCase();
  return t.replace(/[.!?]+$/g, "");
}
function buildLemonCheckoutUrl(waNumber) {
  if (!LEMON_CHECKOUT_URL) throw new Error("Missing LEMON_CHECKOUT_URL in .env");
  const u = new URL(LEMON_CHECKOUT_URL);
  u.searchParams.set("checkout[custom][wa_number]", String(waNumber));
  return u.toString();
}

// -------------------- SG3 24h gate --------------------
function isOutsideCustomerWindow(referenceTsIso) {
  // If we have no reference timestamp, assume "inside" (safer for MVP).
  const ref = safeIso(referenceTsIso);
  if (!ref) return false;

  const refMs = new Date(ref).getTime();
  const nowMs = Date.now();
  const hours = (nowMs - refMs) / (1000 * 60 * 60);

  return hours > WHATSAPP_WINDOW_HOURS;
}

// -------------------- Simple concurrency gate --------------------
const MAX_CONCURRENCY = Math.max(1, Number(process.env.OPENAI_CONCURRENCY || 2));
let inFlight = 0;

async function withConcurrency(fn) {
  while (inFlight >= MAX_CONCURRENCY) await sleep(50);
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

/**
 * Centralized event marker.
 * Always writes outcome + skip_reason when relevant.
 */
async function markEvent(id, patch) {
  const update = {
    processed_at: nowIso(),
    ...patch,
  };

  const { error } = await supabase.from("inbound_events").update(update).eq("id", id);
  if (error) console.log("[worker] markEvent error", error.message || error);
}

/**
 * Classify WhatsApp event from row.
 * Returns one of:
 * - { kind: 'inbound_message', wa_number, text_body }
 * - { kind: 'status_event' }
 * - { kind: 'not_actionable' }
 */
function classifyWhatsAppEvent(eventRow) {
  const meta = eventRow.meta || {};
  const msgType = String(meta.msg_type || meta.type || meta.message_type || "").toLowerCase();

  // Status receipts
  if (msgType === "status" || meta.status) {
    return { kind: "status_event" };
  }

  // Actionable inbound text-like
  const wa_number =
    eventRow.from_phone ||
    eventRow.wa_number ||
    meta.from_phone ||
    meta.from ||
    null;

  const text_body = (
    meta.text_body ||
    meta.text?.body ||
    meta.body ||
    ""
  ).trim();

  const isTextLike = msgType === "text" || msgType === "interactive" || msgType === "button";

  if (!wa_number) return { kind: "not_actionable" };
  if (!isTextLike) return { kind: "not_actionable" };
  if (!text_body) return { kind: "not_actionable" };

  return { kind: "inbound_message", wa_number, text_body };
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

  const freeLimit = settings?.free_limit ?? 3;

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      phone_e164: waNumber,
      phone_hash: hashPhone(waNumber),
      plan: "free",
      status: "active",
      is_paid: false,
      free_remaining: freeLimit,
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

// Rewritten: accept timestamp so we can use provider event time when available
async function updateLastUserMessageAt(waNumber, tsIso) {
  const stamp = safeIso(tsIso) || nowIso();
  await supabase
    .from("users")
    .update({ last_user_message_at: stamp, updated_at: nowIso() })
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

async function sendWhatsAppTemplate(
  toNumber,
  templateName,
  langCode = D360_TEMPLATE_LANG,
  components = []
) {
  const url = `${D360_BASE_URL.replace(/\/$/, "")}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: String(toNumber),
    type: "template",
    template: {
      name: String(templateName),
      language: { code: String(langCode) },
      ...(Array.isArray(components) && components.length ? { components } : {}),
    },
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
    throw new Error(`360dialog template error ${resp.status}: ${t}`);
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
  const maxChars = Number(process.env.OPENAI_MAX_INPUT_CHARS || 6000);
  const capped = String(inputText || "").slice(0, maxChars);

  if (DRY_RUN) {
    return {
      ok: true,
      summary_text: `(DRY RUN) Summary would be generated for:\n${capped.slice(0, 240)}`,
      openai_model: null,
      input_tokens: null,
      output_tokens: null,
      total_tokens: null,
      cost_usd_est: null,
      error_code: null,
    };
  }

  return await withConcurrency(async () => {
    try {
      const r = await summarizeText({ text: capped });

      return {
        ok: true,
        summary_text: r.summaryText,
        openai_model: (process.env.OPENAI_MODEL || "unknown").trim(),
        input_tokens: r.usage?.input_tokens ?? null,
        output_tokens: r.usage?.output_tokens ?? null,
        total_tokens: r.usage?.total_tokens ?? null,
        cost_usd_est: r.cost_usd_est ?? null,
        error_code: null,
      };
    } catch (e) {
      const status = e?.status ?? e?.response?.status ?? null;
      const code = e?.code || e?.error?.code || null;
      const msg = (e?.message || String(e)).slice(0, 200);

      const isQuota =
        String(msg).toLowerCase().includes("quota") ||
        String(code).toLowerCase().includes("insufficient_quota");

      return {
        ok: false,
        summary_text: null,
        openai_model: (process.env.OPENAI_MODEL || "unknown").trim(),
        input_tokens: null,
        output_tokens: null,
        total_tokens: null,
        cost_usd_est: null,
        error_code: isQuota ? "insufficient_quota" : `openai_${status || "error"}`,
      };
    }
  });
}

// -------------------- WhatsApp processing --------------------
// Rewritten signature: include eventTsIso so SG3 gate can use it
async function processWhatsAppTextMessage(waNumber, textBody, eventTsIso) {
  let user = await resolveUser(waNumber);

  // Update last_user_message_at ONLY for inbound actionable messages (we’re in that path)
  // Use provider timestamp if available; fallback to now
  await updateLastUserMessageAt(waNumber, eventTsIso);

  // ---------------- SG3: strict 24-hour gate BEFORE OpenAI ----------------
  const referenceTs = safeIso(eventTsIso) || safeIso(user.last_user_message_at);
  if (isOutsideCustomerWindow(referenceTs)) {
    // Template-only branch, NO OpenAI call, NO paywall, NO decrement
    await sendWhatsAppTemplate(waNumber, HELLO_TEMPLATE_NAME, D360_TEMPLATE_LANG, []);
    return { action: "outside_24h_template_sent", skip_reason: "outside_24h_template_sent" };
  }

  const normalized = normalizeInboundText(textBody);

  if (normalized === "HELP") {
    await sendWhatsAppText(waNumber, buildHelpMessage());
    return { action: "help" };
  }

  if (normalized === "STATUS") {
    await sendWhatsAppText(waNumber, buildStatusMessage(user));
    return { action: "status" };
  }

  if (normalized === "PAY") {
    const url = buildLemonCheckoutUrl(waNumber);
    await sendWhatsAppText(waNumber, `Upgrade here:\n${url}`);
    return { action: "pay_link" };
  }

  if (normalized === "STOP") {
    await supabase
      .from("users")
      .update({ is_blocked: true, blocked_at: nowIso(), updated_at: nowIso() })
      .eq("phone_e164", waNumber);

    await setPendingNotice(waNumber, "blocked");
    await sendWhatsAppText(waNumber, "⛔ Summaries paused. Reply START to resume.");
    return { action: "stop" };
  }

  if (normalized === "START") {
    await supabase
      .from("users")
      .update({ is_blocked: false, blocked_at: null, updated_at: nowIso() })
      .eq("phone_e164", waNumber);

    await sendWhatsAppText(waNumber, "✅ Summaries resumed.");
    return { action: "start" };
  }

  if (normalized === "DELETE") {
    await supabase
      .from("users")
      .update({ deleted_at: nowIso(), status: "deleted", updated_at: nowIso() })
      .eq("phone_e164", waNumber);

    await sendWhatsAppText(waNumber, "✅ Your data is marked for deletion.");
    return { action: "delete" };
  }

  // Refresh user state (block could have been changed elsewhere)
  user = await resolveUser(waNumber);

  if (user.is_blocked) {
    await setPendingNotice(waNumber, "blocked");
    await sendWhatsAppText(waNumber, "⛔ Summaries paused. Reply START.");
    return { action: "blocked_notice" };
  }

  const meaningful = isMeaningfulText(textBody);

  // PAYWALL — MUST happen BEFORE any OpenAI call
  if (user.plan === "free" && meaningful && Number(user.free_remaining || 0) <= 0) {
    await setPendingNotice(waNumber, "paywall");
    await sendWhatsAppText(waNumber, "You’ve used your free summaries.\nReply PAY to upgrade.");
    return { action: "paywall" };
  }

  const result = await generateSummaryOrDryRun(textBody);

  if (!result.ok) {
    await sendWhatsAppText(waNumber, "⚠️ Sorry—summarizer is temporarily busy. Try again.");
    return { action: "summary_failed", error_code: result.error_code || null };
  }

  // SEND FIRST (source of truth for decrement rule)
  await sendWhatsAppText(waNumber, result.summary_text);

  // From here on: never throw (avoid duplicate WhatsApp sends on retries)
  // Best-effort inserts/updates only.
  try {
    await supabase.from("summaries").insert({
      wa_number: waNumber,
      input_chars: textBody.length,
      summary_text: result.summary_text,
      openai_model: result.openai_model || null,
      input_tokens: result.input_tokens ?? null,
      output_tokens: result.output_tokens ?? null,
      total_tokens: result.total_tokens ?? null,
      cost_usd_est: result.cost_usd_est ?? null,
      error_code: result.error_code ?? null,
    });
  } catch (e) {
    console.log("[worker] non-fatal: summaries insert failed", String(e?.message || e).slice(0, 120));
  }

  if (meaningful && user.plan === "free") {
    try {
      await supabase
        .from("users")
        .update({
          free_remaining: Math.max(Number(user.free_remaining || 0) - 1, 0),
          free_used: Number(user.free_used || 0) + 1,
          updated_at: nowIso(),
        })
        .eq("phone_e164", waNumber);
    } catch (e) {
      console.log("[worker] non-fatal: user usage update failed", String(e?.message || e).slice(0, 120));
    }
  }

  return { action: "summarized", dry_run: DRY_RUN };
}

// -------------------- Retry policy --------------------
function isRetryableError(err) {
  const msg = String(err?.message || err || "").toLowerCase();

  // network-ish / transient
  if (msg.includes("fetch failed")) return true;
  if (msg.includes("etimedout") || msg.includes("timeout")) return true;
  if (msg.includes("econnreset") || msg.includes("econnrefused")) return true;

  // 360dialog transient patterns
  if (msg.includes("360dialog error 429")) return true;
  if (
    msg.includes("360dialog error 500") ||
    msg.includes("360dialog error 502") ||
    msg.includes("360dialog error 503")
  ) return true;

  // supabase transient
  if (msg.includes("connection") && msg.includes("terminated")) return true;

  return false;
}

function computeNextAttempt(attempts) {
  // exponential backoff: 5s, 15s, 45s, 2m, 5m (cap)
  const secs = Math.min(300, 5 * Math.pow(3, Math.max(0, attempts)));
  return new Date(Date.now() + secs * 1000).toISOString();
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
    if (provider !== "whatsapp") {
      await markEvent(evId, {
        status: "done",
        outcome: "skipped",
        skip_reason: "provider_ignored",
        last_error: null,
      });
      console.log(`[worker] skipped id=${evId} provider=${provider}`);
      return true;
    }

    const classification = classifyWhatsAppEvent(eventRow);

    if (classification.kind === "status_event") {
      // Never process status receipts
      await markEvent(evId, {
        status: "done",
        outcome: "skipped",
        skip_reason: "status_event",
        last_error: null,
      });
      console.log(`[worker] skipped id=${evId} reason=status_event`);
      return true;
    }

    if (classification.kind === "not_actionable") {
      await markEvent(evId, {
        status: "done",
        outcome: "skipped",
        skip_reason: "not_actionable",
        last_error: null,
      });
      console.log(`[worker] skipped id=${evId} reason=not_actionable`);
      return true;
    }

    // inbound_message
    const { wa_number, text_body } = classification;

    const normalized = normalizeInboundText(text_body);
    const isCmd = KNOWN_COMMANDS.has(normalized);

    console.log(
      `[worker] whatsapp id=${evId} cmd=${isCmd ? normalized : "NO"} meaningful=${isMeaningfulText(
        text_body
      )} dry_run=${DRY_RUN}`
    );

    // Prefer provider timestamp from DB column if present
    const eventTsIso = safeIso(eventRow.user_msg_ts) || null;

    const result = await processWhatsAppTextMessage(wa_number, text_body, eventTsIso);

    // outcome tracking
    const isTemplateOnly = result?.action === "outside_24h_template_sent";
    await markEvent(evId, {
      status: "done",
      outcome: isTemplateOnly ? "skipped" : "done",
      skip_reason: isTemplateOnly ? (result.skip_reason || "outside_24h_template_sent") : null,
      last_error: null,
    });

    console.log(`[worker] done id=${evId} action=${result.action} ms=${Date.now() - startedAt}`);
    return true;
  } catch (e) {
    const msg = String(e?.message || e).slice(0, 300);
    const attempts = Number(eventRow.attempts || 0) + 1;

    const retryable = isRetryableError(e);

    if (retryable && attempts <= 5) {
      const nextAt = computeNextAttempt(attempts);

      await markEvent(evId, {
        status: "pending",
        outcome: "error",
        skip_reason: null,
        last_error: msg,
        attempts,
        next_attempt_at: nextAt,
        locked_at: null,
      });

      console.log(`[worker] retry scheduled id=${evId} attempts=${attempts} next=${nextAt} err=${msg}`);
    } else {
      await markEvent(evId, {
        status: "error",
        outcome: "error",
        skip_reason: null,
        last_error: msg,
        attempts,
        next_attempt_at: null,
      });

      console.log(`[worker] error id=${evId} attempts=${attempts} err=${msg}`);
    }

    return true;
  }
}

async function loop() {
  console.log("[worker] started");
  while (!shouldStop) {
    const didWork = await runOnce();
    await sleep(didWork ? 250 : 2000);
  }
}

loop();
