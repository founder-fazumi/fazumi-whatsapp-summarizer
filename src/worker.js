/**
 * Fazumi Worker (Phase 5 + Legal/Safety MVP)
 *
 * IMPORTANT:
 * ✅ This file is the Cloud Run WORKER POOL entrypoint.
 * ❌ It must NOT start an HTTP server or listen on PORT.
 *
 * Proven invariants retained:
 * - Paywall decision BEFORE OpenAI
 * - Increment/decrement usage ONLY after WhatsApp reply is sent
 * - First-time notice sent once (no summary on first msg)
 * - Implied TOS acceptance on next message after notice
 *
 * Data minimization:
 * - Worker decrypts meta.text_enc, uses it, then wipes it (best-effort)
 *
 * NOTE:
 * - This file references functions you said exist in your project:
 *   ensureFirstTimeNoticeAndTos, processCommand, handleInboundMedia
 * - Keep those as-is (unchanged).
 */

"use strict";

require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const AdmZip = require("adm-zip");

// ---- WORKER VERSION FINGERPRINT ----
const WORKER_VERSION = "p5-workerpool-no-http-2026-02-03a";

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

// 360dialog base
const D360_BASE_URL = process.env.D360_BASE_URL || "https://waba-v2.360dialog.io";
const D360_API_KEY = process.env.D360_API_KEY || "";

// Templates (kept for future proactive messaging; not used for inbound-triggered replies)
const D360_TEMPLATE_LANG = process.env.D360_TEMPLATE_LANG || "en";
const HELLO_TEMPLATE_NAME = process.env.HELLO_TEMPLATE_NAME || "hello_fazumi";
const WHATSAPP_WINDOW_HOURS = Number(process.env.WHATSAPP_WINDOW_HOURS || 24);

// Payments
const LEMON_CHECKOUT_URL = process.env.LEMON_CHECKOUT_URL || "";

// Timezone
const FAZUMI_TZ = process.env.FAZUMI_TZ || "Asia/Qatar";

// ZIP caps
const ZIP_MAX_BYTES = Number(process.env.ZIP_MAX_BYTES || 6_000_000); // 6MB cap
const ZIP_MAX_TEXT_CHARS = Number(process.env.ZIP_MAX_TEXT_CHARS || 1_200_000);

// Supabase storage
const CHAT_EXPORTS_BUCKET = process.env.CHAT_EXPORTS_BUCKET || "fazumi-chat-exports";

// Runtime controls
const DRY_RUN = String(process.env.DRY_RUN || "true").toLowerCase() !== "false";

// Legal links
const TERMS_LINK = process.env.TERMS_LINK || "<terms_link>";
const PRIVACY_LINK = process.env.PRIVACY_LINK || "<privacy_link>";

// IMPORTANT: schema-safe column name for audit tables
const MEDIA_CONFIRM_PHONE_COL = "user_phone";
const DELETION_AUDIT_PHONE_COL = "user_phone";

console.log(
  `[worker] version=${WORKER_VERSION} DRY_RUN=${DRY_RUN} TZ=${FAZUMI_TZ} window_hours=${WHATSAPP_WINDOW_HOURS}`
);

// ---- HARD startup checks (log only lengths / booleans, no secrets) ----
if (typeof fetch !== "function") {
  console.error("[worker] fetch() not available. Use Node 18+.");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[worker] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!D360_API_KEY) {
  console.error("[worker] Missing D360_API_KEY");
  process.exit(1);
}
if (!DRY_RUN && typeof summarizeText !== "function") {
  console.error("[worker] DRY_RUN=false but openai_summarizer not loadable.");
  process.exit(1);
}

console.log("[worker] env ok:", {
  SUPABASE_URL_len: String(SUPABASE_URL).length,
  SUPABASE_SERVICE_ROLE_KEY_len: String(SUPABASE_SERVICE_ROLE_KEY).length,
  D360_API_KEY_len: String(D360_API_KEY).length,
  has_openai: DRY_RUN ? "n/a(dry_run)" : typeof summarizeText === "function",
});

// Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// -------------------- graceful shutdown --------------------
let shouldStop = false;
process.on("SIGINT", () => {
  console.log("[worker] SIGINT received → stopping...");
  shouldStop = true;
});
process.on("SIGTERM", () => {
  console.log("[worker] SIGTERM received → stopping...");
  shouldStop = true;
});

// -------------------- small utils --------------------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function nowIso() {
  return new Date().toISOString();
}
function safeIso(input) {
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
function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
function isMeaningfulText(text) {
  const t = (text || "").trim();
  if (t.length < 20) return false;
  const words = t.split(/\s+/).filter(Boolean);
  return words.length >= 4;
}

/**
 * REWRITE #1 (bugfix): normalize consistently for command detection.
 * - trims, collapses whitespace
 * - uppercases
 * - strips trailing punctuation
 */
function normalizeInboundText(text) {
  const raw = String(text || "");
  const collapsed = raw.trim().replace(/\s+/g, " ");
  const upper = collapsed.toUpperCase();
  return upper.replace(/[.!?]+$/g, "");
}

function buildLemonCheckoutUrl(waNumber) {
  if (!LEMON_CHECKOUT_URL) throw new Error("Missing LEMON_CHECKOUT_URL");
  const u = new URL(LEMON_CHECKOUT_URL);
  u.searchParams.set("checkout[custom][wa_number]", String(waNumber));
  return u.toString();
}

// -------------------- SG3 24h gate (kept for future proactive sending) --------------------
function isOutsideCustomerWindow(referenceTsIso) {
  const ref = safeIso(referenceTsIso);
  if (!ref) return false;

  const refMs = new Date(ref).getTime();
  const hours = (Date.now() - refMs) / (1000 * 60 * 60);

  if (hours < 0) return false; // clock skew
  return hours > WHATSAPP_WINDOW_HOURS;
}

/**
 * IMPORTANT:
 * This worker sends messages only as replies to inbound user messages.
 * Therefore, we DO NOT force templates here (templates are for proactive).
 */
function shouldForceTemplateForInboundReply() {
  return false;
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

// -------------------- Text decryption (AES-256-GCM) --------------------
function getEncKey() {
  const b64 = process.env.FAZUMI_TEXT_ENC_KEY_B64;
  if (!b64) return null;
  try {
    const key = Buffer.from(b64, "base64");
    return key.length === 32 ? key : null;
  } catch {
    return null;
  }
}

function decryptTextEncOrNull(textEnc) {
  try {
    const key = getEncKey();
    if (!key) return null;
    if (!textEnc || typeof textEnc !== "object") return null;

    const iv = Buffer.from(String(textEnc.iv_b64 || ""), "base64");
    const tag = Buffer.from(String(textEnc.tag_b64 || ""), "base64");
    const ct = Buffer.from(String(textEnc.ct_b64 || ""), "base64");

    if (iv.length !== 12 || tag.length < 12 || ct.length < 1) return null;

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString("utf8");
  } catch {
    return null;
  }
}

// -------------------- Supabase queue --------------------
async function dequeueEventJson() {
  const { data, error } = await supabase.rpc("dequeue_inbound_event_json");
  if (error) {
    console.error("[worker] dequeue error:", error.message || error);
    return null;
  }
  if (!data || data.id == null) return null;
  return data;
}

async function markEvent(id, patch) {
  const update = { processed_at: nowIso(), ...patch };
  const { error } = await supabase.from("inbound_events").update(update).eq("id", id);
  if (error) console.log("[worker] markEvent error:", error.message || error);
}

async function wipeInboundEventTextEnc(id) {
  // Best-effort: remove encrypted text after use
  try {
    const { data: row } = await supabase
      .from("inbound_events")
      .select("meta")
      .eq("id", id)
      .maybeSingle();

    const meta = row?.meta || null;
    if (!meta || typeof meta !== "object") return;

    if (meta.text_enc) {
      delete meta.text_enc;
      await supabase.from("inbound_events").update({ meta }).eq("id", id);
    }
  } catch {
    // ignore
  }
}

/**
 * Classify inbound events.
 */
function classifyWhatsAppEvent(eventRow) {
  const meta = eventRow.meta || {};
  const kind = String(meta.event_kind || "").toLowerCase();

  const wa_number = eventRow.from_phone || eventRow.wa_number || meta.from_phone || meta.from || null;
  if (!wa_number) return { kind: "not_actionable" };

  if (kind === "status_event") return { kind: "status_event", wa_number };

  if (kind === "inbound_command") {
    const command = String(meta.command || "").trim().toUpperCase();
    return { kind: "inbound_command", wa_number, command };
  }

  if (kind === "inbound_media") {
    const doc = meta.document || null;
    const media = meta.media || null;
    return { kind: "inbound_media", wa_number, document: doc, media };
  }

  if (kind === "inbound_text") {
    return {
      kind: "inbound_text",
      wa_number,
      text_enc: meta.text_enc || null,
      text_sha256: meta.text_sha256 || null,
    };
  }

  // fallback legacy
  const msgType = String(meta.msg_type || meta.type || meta.message_type || "").toLowerCase();
  if (msgType === "status" || meta.status) return { kind: "status_event", wa_number };

  if (msgType === "document" && meta.document)
    return { kind: "inbound_media", wa_number, document: meta.document, media: null };

  const text_body = (meta.text_body || meta.text?.body || meta.body || "").trim();
  const isTextLike = msgType === "text" || msgType === "interactive" || msgType === "button";
  if (isTextLike && text_body) return { kind: "inbound_text_legacy", wa_number, text_body };

  return { kind: "not_actionable" };
}

// -------------------- Users --------------------

// REWRITE #2 (bugfix): cache free_limit to avoid hitting app_settings every message.
let _cachedFreeLimit = null;
let _cachedFreeLimitAtMs = 0;

async function getFreeLimitCached() {
  const now = Date.now();
  if (_cachedFreeLimit != null && now - _cachedFreeLimitAtMs < 60_000) {
    return _cachedFreeLimit;
  }
  const { data: settings } = await supabase
    .from("app_settings")
    .select("free_limit")
    .eq("id", 1)
    .single();

  const freeLimit = settings?.free_limit ?? 3;
  _cachedFreeLimit = freeLimit;
  _cachedFreeLimitAtMs = now;
  return freeLimit;
}

async function resolveUser(waNumber) {
  const freeLimit = await getFreeLimitCached();

  await supabase.from("users").upsert(
    {
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
    },
    { onConflict: "phone_e164" }
  );

  const { data, error } = await supabase.from("users").select("*").eq("phone_e164", waNumber).single();
  if (error) throw error;
  return data;
}

async function updateLastUserMessageAt(waNumber, tsIso) {
  const stamp = safeIso(tsIso) || nowIso();
  await supabase.from("users").update({ last_user_message_at: stamp, updated_at: nowIso() }).eq("phone_e164", waNumber);
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
}

// -------------------- Legal templates --------------------
function firstTimeNoticeV1() {
  return (
    "👋 Welcome to Fazumi.\n" +
    "I can summarize messages you send here.\n" +
    "By continuing, you allow processing to provide the service.\n" +
    "Please don’t send sensitive/confidential info.\n" +
    "Supported: text + WhatsApp chat ZIP (.txt, “Export chat → Without media”).\n" +
    "Reply HELP for commands. STOP to opt out. DELETE to erase stored data.\n" +
    `Terms: ${TERMS_LINK}\n` +
    `Privacy: ${PRIVACY_LINK}`
  );
}

// -------------------- Commands --------------------
const KNOWN_COMMANDS = new Set([
  "HELP",
  "STATUS",
  "PAY",
  "STOP",
  "START",
  "DELETE",
  "REPORT",
  "BLOCKME",
  "IMPROVE ON",
  "IMPROVE OFF",
  "CONFIRM MEDIA",
]);

function buildStatusMessage(user) {
  return [
    "Fazumi STATUS",
    `Plan: ${user.plan}`,
    `Paid: ${user.is_paid ? "YES" : "NO"}`,
    `Blocked: ${user.is_blocked ? "YES" : "NO"}`,
    user.plan === "free" ? `Free remaining: ${user.free_remaining}` : "Free remaining: N/A",
  ].join("\n");
}

// -------------------- OpenAI summary wrapper --------------------
async function generateSummaryOrDryRun(inputText, eventTsIso) {
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
      const r = await summarizeText({
        text: capped,
        anchor_ts_iso: eventTsIso || null,
        timezone: FAZUMI_TZ,
      });
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
      return {
        ok: false,
        summary_text: null,
        openai_model: (process.env.OPENAI_MODEL || "unknown").trim(),
        input_tokens: null,
        output_tokens: null,
        total_tokens: null,
        cost_usd_est: null,
        error_code: `openai_${status || "error"}`,
      };
    }
  });
}

// ===================== Your existing ZIP / media / delete / command handlers =====================
// Keep your existing implementations in your repo.
// These are required and assumed to exist:
const { ensureFirstTimeNoticeAndTos } = require("./legal");
const { processCommand } = require("./commands");
const { handleInboundMedia } = require("./media");

// ===================== Main WhatsApp processing =====================
async function processWhatsAppText(waNumber, user, textBody, eventTsIso) {
  if (user.is_blocked) {
    await sendWhatsAppText(waNumber, "⛔ Summaries paused. Reply START to resume.");
    await updateLastUserMessageAt(waNumber, eventTsIso);
    return { action: "blocked_notice" };
  }

  // Always record the inbound user message timestamp first
  await updateLastUserMessageAt(waNumber, eventTsIso);

  // Inbound replies never force templates
  if (shouldForceTemplateForInboundReply()) {
    // (kept for completeness; currently always false)
    await sendWhatsAppText(waNumber, "Hello 👋");
    return { action: "template_not_used_in_inbound_reply" };
  }

  const meaningful = isMeaningfulText(textBody);

  // Paywall BEFORE OpenAI
  if (user.plan === "free" && meaningful && Number(user.free_remaining || 0) <= 0) {
    await sendWhatsAppText(waNumber, "You’ve used your free summaries.\nReply PAY to upgrade.");
    return { action: "paywall" };
  }

  const result = await generateSummaryOrDryRun(textBody, eventTsIso);

  if (!result.ok) {
    await sendWhatsAppText(waNumber, "⚠️ Sorry—summarizer is temporarily busy. Try again.");
    return { action: "summary_failed", error_code: result.error_code || null };
  }

  // Send FIRST
  await sendWhatsAppText(waNumber, result.summary_text);

  // Non-fatal inserts
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
    console.log("[worker] non-fatal: summaries insert failed:", String(e?.message || e).slice(0, 120));
  }

  // Decrement after successful send
  try {
    if (user.plan === "free" && meaningful) {
      await supabase
        .from("users")
        .update({
          free_remaining: Math.max(0, Number(user.free_remaining || 0) - 1),
          free_used: Number(user.free_used || 0) + 1,
          updated_at: nowIso(),
        })
        .eq("phone_e164", waNumber);
    }
  } catch (e) {
    console.log("[worker] non-fatal: decrement failed:", String(e?.message || e).slice(0, 120));
  }

  return { action: "summary_sent", meaningful };
}

// -------------------- main loop --------------------

// REWRITE #3 (bugfix): better idle backoff + clear heartbeat + safe timestamp selection.
async function mainLoop() {
  console.log("[worker] loop started (no HTTP)");

  let idleMs = 250;
  const idleMax = 2000;

  while (!shouldStop) {
    const row = await dequeueEventJson();

    if (!row) {
      idleMs = Math.min(idleMax, Math.floor(idleMs * 1.2));
      await sleep(idleMs);
      continue;
    }

    idleMs = 250; // reset on work

    const { id, meta, received_at, user_msg_ts } = row;
    const classified = classifyWhatsAppEvent(row);

    // prefer top-level user_msg_ts, then meta, then received_at
    const eventTsIso =
      safeIso(user_msg_ts) ||
      safeIso(meta?.user_msg_ts) ||
      safeIso(meta?.timestamp) ||
      safeIso(received_at) ||
      nowIso();

    try {
      if (classified.kind === "status_event") {
        await markEvent(id, { status: "processed", outcome: "status_ignored" });
        continue;
      }

      if (classified.kind === "not_actionable") {
        await markEvent(id, { status: "processed", outcome: "not_actionable" });
        continue;
      }

      const waNumber = classified.wa_number;

      // Ensure user exists
      let user = await resolveUser(waNumber);

      // Legal: first-time notice and implied TOS acceptance
      const legal = await ensureFirstTimeNoticeAndTos(waNumber, user);
      if (legal.stop) {
        await markEvent(id, { status: "processed", outcome: legal.outcome || "privacy_notice_sent" });
        continue;
      }

      // Refresh after legal patch
      user = await resolveUser(waNumber);

      // Commands
      if (classified.kind === "inbound_command") {
        const r = await processCommand(waNumber, user, classified.command, eventTsIso);
        await markEvent(id, { status: "processed", outcome: r.action || "command_processed" });
        continue;
      }

      // Media
      if (classified.kind === "inbound_media") {
        const r = await handleInboundMedia(waNumber, classified, row);
        await markEvent(id, { status: "processed", outcome: r.action || "media_processed" });
        continue;
      }

      // Text
      let textBody = null;
      if (classified.kind === "inbound_text") {
        textBody = decryptTextEncOrNull(classified.text_enc);
      } else if (classified.kind === "inbound_text_legacy") {
        textBody = classified.text_body;
      }

      if (!textBody || !String(textBody).trim()) {
        await markEvent(id, { status: "processed", outcome: "empty_text" });
        continue;
      }

      const normalized = normalizeInboundText(textBody);
      if (KNOWN_COMMANDS.has(normalized)) {
        const r = await processCommand(waNumber, user, normalized, eventTsIso);
        await markEvent(id, { status: "processed", outcome: r.action || "command_processed" });
        continue;
      }

      const r = await processWhatsAppText(waNumber, user, textBody, eventTsIso);

      await markEvent(id, {
        status: "processed",
        outcome: r.action || "processed",
        skip_reason: r.skip_reason || null,
        meta: { ...(meta || {}), outcome: r.action || "processed", skip_reason: r.skip_reason || null },
      });
    } catch (e) {
      await markEvent(id, {
        status: "error",
        outcome: "worker_error",
        last_error: String(e?.message || e).slice(0, 300),
      });
      console.log("[worker] non-fatal loop error:", String(e?.message || e).slice(0, 200));
    } finally {
      await wipeInboundEventTextEnc(id);
    }
  }

  console.log("[worker] loop stopped");
}

mainLoop().catch((e) => {
  console.error("[worker] fatal:", String(e?.message || e).slice(0, 300));
  process.exit(1);
});
