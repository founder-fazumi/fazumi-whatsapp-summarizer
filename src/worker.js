/**
 * Fazumi Worker (Phase 5 + Legal/Safety MVP)
 *
 * IMPORTANT:
 * ✅ This file is the Cloud Run WORKER POOL entrypoint.
 * ❌ It must NOT start an HTTP server or listen on PORT.
 *
 * Proven invariants retained:
 * - Paywall decision BEFORE OpenAI
 * - Increment usage ONLY after WhatsApp reply is sent
 * - First-time notice sent once (no summary on first msg)
 * - Implied TOS acceptance on next message after notice
 *
 * Data minimization:
 * - Worker fetches inbound text from private storage via meta.text_ref
 * - Legacy/compat: decrypts inbound_events.meta.text_enc when present
 */

"use strict";

require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const { normalizeProvider, safeInsertInboundEvent } = require("./supabase");

// ---- WORKER VERSION FINGERPRINT ----
const WORKER_VERSION = "p5-workerpool-text-only-mvp-2026-02-13";

// ---- OpenAI summarizer (CommonJS) ----
let summarizeText = null;
try {
  ({ summarizeText } = require("./openai_summarizer"));
} catch (e) {
  summarizeText = null;
}

// -------------------- ENV --------------------
/**
 * REWRITE #1 (bugfix): Normalize env inputs safely.
 * - trim() to remove hidden whitespace/newlines from Secret Manager / copy-paste
 * - support a fallback name if you accidentally truncated an env var in Cloud Run UI
 */
function envTrim(name, fallbackName = null) {
  const v = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);
  if (v == null) return null;
  const s = String(v);
  const t = s.trim();
  return t.length ? t : null;
}

const SUPABASE_URL = envTrim("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = envTrim("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KE"); // fallback for accidental truncation

// 360dialog base
const D360_BASE_URL = envTrim("D360_BASE_URL") || "https://waba-v2.360dialog.io";
const D360_API_KEY = envTrim("D360_API_KEY") || "";

// Templates (kept for future proactive messaging; not used for inbound-triggered replies)
const D360_TEMPLATE_LANG = envTrim("D360_TEMPLATE_LANG") || "en";
const HELLO_TEMPLATE_NAME = envTrim("HELLO_TEMPLATE_NAME") || "hello_fazumi";
const WHATSAPP_WINDOW_HOURS = Number(envTrim("WHATSAPP_WINDOW_HOURS") || 24);

// Timezone
const FAZUMI_TZ = envTrim("FAZUMI_TZ") || "Asia/Qatar";

// Runtime controls
const DRY_RUN = String(process.env.DRY_RUN || "false").toLowerCase() === "true";
const BURST_WINDOW_MS =
  parseIntEnv(envTrim("BURST_WINDOW_MS"), null, 1000) ||
  parseIntEnv(envTrim("BURST_SECONDS"), 6, 1) * 1000 ||
  6000;
const BURST_SECONDS = Math.max(1, Math.ceil(BURST_WINDOW_MS / 1000));
const BURST_MIN_MESSAGES = parseIntEnv(envTrim("BURST_MIN_MESSAGES"), 2, 1);
const PHONE_BURST_LOCK_SECONDS = parseIntEnv(
  envTrim("PHONE_BURST_LOCK_SECONDS"),
  30,
  5
);
const PHONE_LOCK_RETRY_MS = parseIntEnv(envTrim("PHONE_LOCK_RETRY_MS"), 1000, 100);

// TODO: replace Terms/Privacy placeholders with real Notion links.
// Legal links (don’t invent links)
const TERMS_LINK = envTrim("TERMS_LINK") || "Terms/Privacy pages coming soon.";
const PRIVACY_LINK = envTrim("PRIVACY_LINK") || "Terms/Privacy pages coming soon.";

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
  console.error("[worker] env-check missing:", {
    hasUrl: !!SUPABASE_URL,
    hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
    // also show whether the fallback truncated var exists
    hasTruncatedFallback: !!process.env.SUPABASE_SERVICE_ROLE_KE,
  });
  process.exit(1);
}
if (!D360_API_KEY) {
  console.error("[worker] Missing D360_API_KEY");
  process.exit(1);
}
if (typeof summarizeText !== "function") {
  console.error("[worker] openai_summarizer not loadable.");
  process.exit(1);
}

/**
 * REWRITE #2 (bugfix): Safe runtime env proof.
 * - Only booleans (no secret material)
 */
console.log("[env-check]", {
  hasUrl: !!SUPABASE_URL,
  hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
  hasD360: !!D360_API_KEY,
});

// Supabase admin client
/**
 * REWRITE #3 (bugfix): Use non-session client settings.
 * - Avoid any token refresh/persist behavior in a stateless worker.
 * - Ensure headers are set consistently.
 */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY, // explicit
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, // explicit
      "x-client-info": `fazumi-worker/${WORKER_VERSION}`,
    },
  },
});

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

function truncateErr500(errLike) {
  return String(errLike?.message || errLike || "").slice(0, 500);
}

function tailN(v, n) {
  const s = String(v || "");
  return s.length <= n ? s : s.slice(-n);
}

function parseIntEnv(rawValue, fallback, minValue = 0) {
  if (rawValue == null) return fallback;
  const n = Number(rawValue);
  if (!Number.isFinite(n)) return fallback;
  const v = Math.floor(n);
  if (v < minValue) return fallback;
  return v;
}

// -------------------- PII-safe helpers --------------------
function hashPhone(phoneE164) {
  return crypto.createHash("sha256").update(String(phoneE164), "utf8").digest("hex");
}

function normalizePhoneE164(rawPhone) {
  const raw = String(rawPhone || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return `+${digits}`;
}
function isMeaningfulText(text) {
  const t = (text || "").trim();
  if (t.length < 20) return false;
  const words = t.split(/\s+/).filter(Boolean);
  return words.length >= 4;
}

// normalize for command detection
function normalizeInboundText(text) {
  const raw = String(text || "");
  const collapsed = raw.trim().replace(/\s+/g, " ");
  const upper = collapsed.toUpperCase();
  return upper.replace(/[.!?]+$/g, "");
}

function extractCommandText(text) {
  const raw = String(text || "").trim().replace(/\s+/g, " ");
  if (!raw) return null;

  if (/^\/?FEEDBACK\s*:.*$/i.test(raw)) {
    return raw.replace(/^\/+/, "");
  }

  const normalized = normalizeInboundText(raw);

  // Accept leading slash and trailing punctuation from mobile keyboards.
  const cleaned = normalized.replace(/^\/+/, "").replace(/[:;,.!?]+$/g, "").trim();
  if (!cleaned) return null;

  if (/^LANG(?:\s+(?:AUTO|EN|AR|ES))$/.test(cleaned)) return cleaned;
  if (KNOWN_COMMANDS.has(cleaned)) return cleaned;
  return null;
}

function splitByTimestampHeuristic(lines) {
  const tsStartRe =
    /^\s*(?:\[\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\]?|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s+-)/;

  const groups = [];
  let current = [];
  let timestampHits = 0;

  for (const line of lines) {
    const trimmed = String(line || "").trim();
    if (!trimmed) continue;

    if (tsStartRe.test(trimmed)) {
      timestampHits++;
      if (current.length) groups.push(current.join("\n").trim());
      current = [trimmed];
      continue;
    }

    if (!current.length) {
      current = [trimmed];
    } else {
      current.push(trimmed);
    }
  }

  if (current.length) groups.push(current.join("\n").trim());

  const units = groups.filter(Boolean);
  if (timestampHits >= 2 && units.length >= 2) return units;
  return null;
}

function splitByBulletHeuristic(lines) {
  const bulletStartRe = /^\s*(?:[-*•▪◦]\s+|\d{1,2}[.)]\s+)/;
  const groups = [];
  let current = [];
  let bulletHits = 0;

  for (const line of lines) {
    const trimmed = String(line || "").trim();
    if (!trimmed) continue;

    if (bulletStartRe.test(trimmed)) {
      bulletHits++;
      if (current.length) groups.push(current.join("\n").trim());
      current = [trimmed];
      continue;
    }

    if (!current.length) continue;
    current.push(trimmed);
  }

  if (current.length) groups.push(current.join("\n").trim());

  const units = groups.filter(Boolean);
  if (bulletHits >= 3 && units.length >= 3) return units;
  return null;
}

function splitByParagraphHeuristic(text) {
  const blocks = String(text || "")
    .split(/\n{2,}/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (blocks.length < 2 || blocks.length > 12) return null;
  const substantive = blocks.filter((x) => x.length >= 20);
  if (substantive.length < 2) return null;
  return blocks;
}

function splitIntoLogicalMessages(text) {
  const raw = String(text || "").replace(/\r\n?/g, "\n").trim();
  if (!raw) return [];

  const lines = raw.split("\n");
  if (lines.length < 2) return [raw];

  const byTimestamp = splitByTimestampHeuristic(lines);
  if (byTimestamp) return byTimestamp.slice(0, 60);

  const byBullets = splitByBulletHeuristic(lines);
  if (byBullets) return byBullets.slice(0, 60);

  const byParagraph = splitByParagraphHeuristic(raw);
  if (byParagraph) return byParagraph.slice(0, 60);

  return [raw];
}

function buildSummarizerInputText(inputText, maxChars) {
  const text = String(inputText || "");
  const logicalMessages = splitIntoLogicalMessages(text);

  if (logicalMessages.length <= 1) {
    return {
      text: text.slice(0, maxChars),
      logicalMessageCount: 1,
    };
  }

  const header =
    `MULTI_MESSAGE_INPUT (${logicalMessages.length} messages)\n` +
    "Treat each MESSAGE block as a separate message in chronological order.\n\n";
  const body = logicalMessages.map((msg, idx) => `--- MESSAGE ${idx + 1} ---\n${msg}`).join("\n\n");
  const combined = `${header}${body}`;

  return {
    text: combined.length > maxChars ? combined.slice(0, maxChars) : combined,
    logicalMessageCount: logicalMessages.length,
  };
}

// -------------------- Simple concurrency gate --------------------
const MAX_CONCURRENCY = parseIntEnv(envTrim("OPENAI_CONCURRENCY"), 2, 1);
const CONCURRENCY_WAIT_TIMEOUT_MS = parseIntEnv(
  envTrim("OPENAI_CONCURRENCY_WAIT_TIMEOUT_MS"),
  8000,
  0
);
const CONCURRENCY_WAIT_POLL_MS = 50;
let inFlight = 0;
async function withConcurrency(fn, opts = {}) {
  const timeoutMs = Number.isFinite(Number(opts?.timeoutMs)) ? Number(opts.timeoutMs) : null;
  const start = Date.now();

  while (inFlight >= MAX_CONCURRENCY) {
    if (timeoutMs != null && Date.now() - start > timeoutMs) {
      const err = new Error("concurrency_timeout");
      err.code = "concurrency_timeout";
      err.waited_ms = Date.now() - start;
      err.inFlight = inFlight;
      err.max = MAX_CONCURRENCY;
      throw err;
    }
    await sleep(CONCURRENCY_WAIT_POLL_MS);
  }
  inFlight++;
  try {
    return await fn();
  } finally {
    inFlight--;
  }
}

// -------------------- Text decryption (AES-256-GCM) --------------------
function getEncKey() {
  const b64Raw = envTrim("FAZUMI_TEXT_ENC_KEY_B64");
  if (!b64Raw) {
    return { ok: false, key: null, error_code: "missing_enc_key" };
  }

  try {
    const key = Buffer.from(b64Raw, "base64");
    if (key.length !== 32) {
      return { ok: false, key: null, error_code: "bad_enc_key_len" };
    }
    return { ok: true, key, error_code: null };
  } catch {
    return { ok: false, key: null, error_code: "bad_enc_key_b64" };
  }
}

function decryptTextEncOrNull(textEnc) {
  if (!textEnc || typeof textEnc !== "object") {
    return { ok: false, text: null, error_code: "missing_text_enc", version: null };
  }

  const keyResult = getEncKey();
  if (!keyResult.ok || !keyResult.key) {
    return {
      ok: false,
      text: null,
      error_code: keyResult.error_code || "missing_enc_key",
      version: textEnc.v ?? null,
    };
  }

  const version = textEnc.v ?? null;
  if (version !== 1 && version !== "1") {
    return { ok: false, text: null, error_code: "unsupported_enc_version", version };
  }

  let iv;
  let tag;
  let ct;
  try {
    iv = Buffer.from(String(textEnc.iv_b64 || ""), "base64");
    tag = Buffer.from(String(textEnc.tag_b64 || ""), "base64");
    ct = Buffer.from(String(textEnc.ct_b64 || ""), "base64");
  } catch {
    return { ok: false, text: null, error_code: "decrypt_failed", version };
  }
  if (iv.length !== 12 || tag.length !== 16 || ct.length < 1) {
    return { ok: false, text: null, error_code: "decrypt_failed", version };
  }

  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", keyResult.key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return { ok: true, text: pt.toString("utf8"), error_code: null, version };
  } catch {
    return { ok: false, text: null, error_code: "decrypt_failed", version };
  }
}

async function downloadInboundTextFromStorage(textRef) {
  try {
    if (!textRef || typeof textRef !== "object") return { ok: false, reason: "missing_text_ref" };
    const bucket = String(textRef.bucket || "").trim();
    const path = String(textRef.path || "").trim();
    if (!bucket || !path) return { ok: false, reason: "bad_text_ref" };

    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) return { ok: false, reason: "download_failed" };

    let buf = null;
    if (Buffer.isBuffer(data)) {
      buf = data;
    } else if (data instanceof Uint8Array) {
      buf = Buffer.from(data);
    } else if (typeof data.arrayBuffer === "function") {
      const ab = await data.arrayBuffer();
      buf = Buffer.from(ab);
    } else {
      return { ok: false, reason: "download_unexpected" };
    }

    return { ok: true, text: buf.toString("utf8"), bytes: buf.length };
  } catch {
    return { ok: false, reason: "download_exception" };
  }
}

function isBurstBatchEligibleKind(kind) {
  return kind === "inbound_text" || kind === "inbound_text_legacy";
}

function isoToMsOrNull(isoValue) {
  const iso = safeIso(isoValue);
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function getBurstAnchorIso(row) {
  return safeIso(row?.created_at) || safeIso(row?.received_at) || nowIso();
}

function getRowReceivedIso(row) {
  return safeIso(row?.received_at) || safeIso(row?.created_at) || safeIso(row?.user_msg_ts) || null;
}

async function tryClaimPhoneBurstLock(phoneE164, ownerId) {
  const phone = normalizePhoneE164(phoneE164);
  if (!phone || !ownerId) return { claimed: false };
  try {
    const { data, error } = await supabase.rpc("try_claim_worker_phone_lock", {
      p_phone_e164: String(phone),
      p_lock_owner: String(ownerId),
      p_lock_seconds: PHONE_BURST_LOCK_SECONDS,
    });
    if (error) {
      console.log(`[batch] lock_error phone=${tailN(phone, 4)} owner=${tailN(ownerId, 8)}`);
      return { claimed: false };
    }
    return { claimed: data === true };
  } catch {
    return { claimed: false };
  }
}

async function releasePhoneBurstLock(phoneE164, ownerId) {
  const phone = normalizePhoneE164(phoneE164);
  if (!phone || !ownerId) return;
  try {
    await supabase.rpc("release_worker_phone_lock", {
      p_phone_e164: String(phone),
      p_lock_owner: String(ownerId),
    });
  } catch {
    // best effort
  }
}

async function deferDueToPhoneLock(eventId) {
  const retryAtIso = new Date(Date.now() + PHONE_LOCK_RETRY_MS).toISOString();
  const { error } = await supabase
    .from("inbound_events")
    .update({
      status: "pending",
      outcome: "burst_lock_deferred",
      skip_reason: "phone_lock_busy",
      next_attempt_at: retryAtIso,
      processed_at: null,
    })
    .eq("id", eventId)
    .eq("status", "processing");
  if (error) {
    console.log(`[batch] lock_defer_failed id_last4=${tailN(eventId, 4)}`);
  }
}

async function deferToBurstPrimary(currentId, primaryId) {
  const { error } = await supabase
    .from("inbound_events")
    .update({
      status: "pending",
      outcome: "burst_deferred",
      skip_reason: `burst_waiting_for_${primaryId}`,
      processed_at: null,
    })
    .eq("id", currentId)
    .eq("status", "processing");
  if (error) {
    console.log(
      `[batch] defer_failed id_last4=${tailN(currentId, 4)} primary_last4=${tailN(primaryId, 4)}`
    );
  }
}

function compareRowsByAnchor(a, b) {
  const aMs = isoToMsOrNull(getRowReceivedIso(a)) ?? 0;
  const bMs = isoToMsOrNull(getRowReceivedIso(b)) ?? 0;
  if (aMs !== bMs) return aMs - bMs;
  return Number(a?.id || 0) - Number(b?.id || 0);
}

async function fetchUnprocessedTextRowsForPhone(waNumber, maxRows = 400) {
  const phone = normalizePhoneE164(waNumber);
  if (!phone) return [];
  const { data, error } = await supabase
    .from("inbound_events")
    .select(
      "id, meta, created_at, received_at, user_msg_ts, wa_message_id, from_phone, wa_number, status, provider, processed_at, next_attempt_at"
    )
    .eq("provider", "whatsapp")
    .or(`from_phone.eq.${phone},wa_number.eq.${phone}`)
    .is("processed_at", null)
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(maxRows);
  if (error || !Array.isArray(data)) return [];

  const textRows = [];
  for (const row of data) {
    const classified = classifyWhatsAppEvent(row);
    if (isBurstBatchEligibleKind(classified.kind)) textRows.push(row);
  }
  textRows.sort(compareRowsByAnchor);
  return textRows;
}

async function fetchBurstRowsUpToDeadline(waNumber, deadlineIso) {
  return fetchBurstRowsForFinalize(waNumber, null, deadlineIso, 600);
}

async function fetchBurstRowsForFinalize(waNumber, anchorIso, deadlineIso, maxRows = 800) {
  const phone = normalizePhoneE164(waNumber);
  const deadline = safeIso(deadlineIso);
  if (!phone || !deadline) return [];

  const query = supabase
    .from("inbound_events")
    .select(
      "id, meta, created_at, received_at, user_msg_ts, wa_message_id, from_phone, wa_number, status, provider, processed_at, next_attempt_at"
    )
    .eq("provider", "whatsapp")
    .or(`from_phone.eq.${phone},wa_number.eq.${phone}`)
    .is("processed_at", null)
    .in("status", ["pending", "processing"])
    .lte("received_at", deadline)
    .order("received_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(maxRows);

  if (safeIso(anchorIso)) query.gte("received_at", safeIso(anchorIso));

  const { data, error } = await query;
  if (error || !Array.isArray(data)) return [];

  const textRows = [];
  for (const row of data) {
    const classified = classifyWhatsAppEvent(row);
    if (isBurstBatchEligibleKind(classified.kind)) textRows.push(row);
  }
  textRows.sort(compareRowsByAnchor);
  return textRows;
}

async function getPhoneBurstState(waNumber) {
  const phone = normalizePhoneE164(waNumber);
  if (!phone) return null;
  const { data, error } = await supabase
    .from("phone_bursts")
    .select("phone_e164, anchor_received_at, deadline_at")
    .eq("phone_e164", phone)
    .maybeSingle();
  if (error) return null;
  return data || null;
}

async function claimRowsForBurstFinalize(rowIds, parentId) {
  if (!Array.isArray(rowIds) || rowIds.length === 0) return new Set();
  const uniqueIds = Array.from(new Set(rowIds.map((x) => Number(x)).filter((x) => Number.isFinite(x))));
  if (uniqueIds.length === 0) return new Set();
  try {
    const { data, error } = await supabase
      .from("inbound_events")
      .update({
        status: "processing",
        outcome: "burst_claimed",
        skip_reason: `burst_claimed_by_${parentId}`,
        processed_at: null,
      })
      .in("id", uniqueIds)
      .in("status", ["pending", "processing"])
      .is("processed_at", null)
      .select("id");
    if (error || !Array.isArray(data)) return new Set();
    return new Set(data.map((x) => Number(x.id)).filter((x) => Number.isFinite(x)));
  } catch {
    return new Set();
  }
}

async function rescheduleLeaderForBurstDeadline(eventId, deadlineIso) {
  const reason = `burst_wait_until_${String(deadlineIso || "").slice(0, 19)}`;
  const { error } = await supabase
    .from("inbound_events")
    .update({
      status: "pending",
      outcome: "burst_waiting",
      skip_reason: reason,
      next_attempt_at: deadlineIso || null,
      processed_at: null,
    })
    .eq("id", eventId)
    .eq("status", "processing");

  if (error) {
    console.log(`[batch] reschedule_failed id_last4=${tailN(eventId, 4)}`);
  }
}

function buildBurstSendKey(waNumber, burstDeadlineIso) {
  const anchorMs = isoToMsOrNull(burstDeadlineIso) ?? 0;
  const phoneKey = hashPhone(waNumber).slice(0, 20);
  return `burst_send:${phoneKey}:${String(anchorMs)}`;
}

async function claimBurstSendToken(waNumber, burstAnchorIso) {
  const burstKey = buildBurstSendKey(waNumber, burstAnchorIso);
  const row = {
    provider: normalizeProvider("waba", "whatsapp"),
    status: "done",
    attempts: 0,
    provider_event_id: String(burstKey || "").trim(),
    payload_sha256: crypto.createHash("sha256").update(burstKey, "utf8").digest("hex"),
    wa_number: waNumber,
    from_phone: waNumber,
    user_msg_ts: safeIso(burstAnchorIso) || nowIso(),
    meta: {
      event_kind: "burst_send_token",
      burst_key: burstKey,
    },
  };

  const inserted = await safeInsertInboundEvent(supabase, row);
  if (inserted?.ok && inserted?.inserted === false) return { claimed: false, burstKey };
  if (inserted?.ok) return { claimed: true, burstKey };
  throw inserted?.error || new Error("burst_send_token_insert_failed");
}

async function releaseBurstSendToken(burstKey) {
  const key = String(burstKey || "").trim();
  if (!key) return;
  try {
    await supabase
      .from("inbound_events")
      .delete()
      .in("provider", [normalizeProvider("whatsapp", "whatsapp"), "system"])
      .eq("provider_event_id", key);
  } catch {
    // best effort
  }
}

async function buildBurstBatch(primaryRow, primaryClassified, primaryTextBody) {
  if (!isBurstBatchEligibleKind(primaryClassified?.kind)) {
    return {
      ok: true,
      textBody: String(primaryTextBody || ""),
      burstRows: [primaryRow],
      burstRowIds: [Number(primaryRow?.id)],
      leaderId: primaryRow?.id || null,
      deadlineIso: safeIso(primaryRow?.next_attempt_at) || nowIso(),
      anchorIso: safeIso(primaryRow?.received_at) || nowIso(),
    };
  }

  const waNumber = normalizePhoneE164(
    primaryClassified.wa_number || primaryRow?.from_phone || primaryRow?.wa_number || null
  );
  if (!waNumber) {
    return {
      ok: true,
      textBody: String(primaryTextBody || ""),
      burstRows: [primaryRow],
      burstRowIds: [Number(primaryRow?.id)],
      leaderId: primaryRow?.id || null,
      deadlineIso: safeIso(primaryRow?.next_attempt_at) || nowIso(),
      anchorIso: safeIso(primaryRow?.received_at) || nowIso(),
    };
  }

  const burstState = await getPhoneBurstState(waNumber);
  const fallbackAnchor = safeIso(getRowReceivedIso(primaryRow)) || nowIso();
  const fallbackDeadline =
    safeIso(primaryRow?.next_attempt_at) || new Date(Date.parse(fallbackAnchor) + BURST_WINDOW_MS).toISOString();
  const burstAnchorIso = safeIso(burstState?.anchor_received_at) || fallbackAnchor;
  const burstDeadlineIso = safeIso(burstState?.deadline_at) || fallbackDeadline;
  const burstDeadlineMs = isoToMsOrNull(burstDeadlineIso) ?? Date.now();
  const nowMs = Date.now();
  const waitMs = Math.max(0, burstDeadlineMs - nowMs);
  if (waitMs > 0) {
    return {
      ok: false,
      waitUntilIso: burstDeadlineIso,
      waitMs,
      waNumber,
      leaderId: primaryRow?.id || null,
      nowIso: new Date(nowMs).toISOString(),
      anchorIso: burstAnchorIso,
      deadlineIso: burstDeadlineIso,
    };
  }

  const sendToken = await claimBurstSendToken(waNumber, burstAnchorIso);
  if (!sendToken.claimed) {
    return {
      ok: false,
      alreadySent: true,
      burstKey: sendToken.burstKey,
      waNumber,
      leaderId: primaryRow?.id || null,
      anchorIso: burstAnchorIso,
      deadlineIso: burstDeadlineIso,
    };
  }

  const burstRows = await fetchBurstRowsForFinalize(waNumber, burstAnchorIso, burstDeadlineIso, 800);
  if (!burstRows.find((row) => Number(row.id) === Number(primaryRow.id))) {
    burstRows.push(primaryRow);
    burstRows.sort(compareRowsByAnchor);
  }
  const claimedIds = await claimRowsForBurstFinalize(
    burstRows.map((row) => Number(row.id)),
    primaryRow.id
  );
  if (claimedIds.size === 0) {
    return {
      ok: false,
      alreadySent: true,
      burstKey: sendToken.burstKey,
      waNumber,
      leaderId: primaryRow?.id || null,
      anchorIso: burstAnchorIso,
      deadlineIso: burstDeadlineIso,
    };
  }

  const claimedRows = burstRows.filter((row) => claimedIds.has(Number(row.id)));
  if (!claimedRows.find((row) => Number(row.id) === Number(primaryRow.id)) && claimedIds.has(Number(primaryRow.id))) {
    claimedRows.unshift(primaryRow);
  }

  const texts = [];
  for (const row of claimedRows) {
    if (Number(row.id) === Number(primaryRow.id)) {
      if (String(primaryTextBody || "").trim()) texts.push(String(primaryTextBody || ""));
      continue;
    }

    const extraClassified = classifyWhatsAppEvent(row);
    if (!isBurstBatchEligibleKind(extraClassified.kind)) continue;
    const loaded = await loadTextForClassifiedEvent(row, extraClassified);
    if (loaded.ok && !loaded.empty) texts.push(String(loaded.textBody || ""));
  }

  const combinedText = texts.length > 1 ? combineBurstMessagesForSummary(texts) : String(texts[0] || "");
  const burstRowIds = Array.from(claimedIds).sort((a, b) => a - b);

  return {
    ok: true,
    textBody: combinedText,
    burstRows: claimedRows,
    burstRowIds,
    burstMessageCount: texts.length,
    burstKey: sendToken.burstKey,
    waNumber,
    leaderId: primaryRow?.id || null,
    anchorIso: burstAnchorIso,
    deadlineIso: burstDeadlineIso,
  };
}

function combineBurstMessagesForSummary(messageTexts) {
  return messageTexts
    .map((t, idx) => `--- MESSAGE ${idx + 1} ---\n${String(t || "").trim()}`)
    .filter((x) => x.trim())
    .join("\n\n");
}

async function loadTextForClassifiedEvent(row, classified) {
  if (classified.kind === "inbound_text_legacy") {
    return {
      ok: true,
      textBody: classified.text_body || "",
      hasTextRef: false,
      storageFetchStatus: null,
      metaTextLen: Number.isFinite(Number(row?.meta?.text_len)) ? Number(row.meta.text_len) : null,
      hasTextEnc: false,
      decryptStatus: "n/a",
      decryptReason: null,
      lastErrorCode: null,
      fetchFailed: false,
      empty: !String(classified.text_body || "").trim(),
    };
  }

  if (classified.kind !== "inbound_text") {
    return {
      ok: false,
      textBody: "",
      hasTextRef: false,
      storageFetchStatus: null,
      metaTextLen: null,
      hasTextEnc: false,
      decryptStatus: "n/a",
      decryptReason: null,
      lastErrorCode: null,
      fetchFailed: false,
      empty: true,
    };
  }

  let textBody = null;
  const hasTextRef = Boolean(classified.text_ref?.bucket && classified.text_ref?.path);
  let storageFetchStatus = null;
  const metaTextLen = Number.isFinite(Number(row?.meta?.text_len)) ? Number(row.meta.text_len) : null;
  const hasEnc = Boolean(classified.text_enc && typeof classified.text_enc === "object");
  let decryptStatus = "n/a";
  let decryptReason = null;
  let lastErrorCode = null;

  if (hasEnc) {
    const dec = decryptTextEncOrNull(classified.text_enc);
    decryptStatus = dec.ok ? "ok" : "failed";
    decryptReason = dec.ok ? null : dec.error_code || "decrypt_failed";
    if (dec.ok && String(dec.text || "").trim()) {
      textBody = dec.text;
    } else if (!dec.ok) {
      lastErrorCode = dec.error_code || "decrypt_failed";
    }
    storageFetchStatus = hasTextRef ? "skipped_by_text_enc" : "n/a";
  } else if (hasTextRef) {
    const fetched = await downloadInboundTextFromStorage(classified.text_ref);
    storageFetchStatus = fetched.ok ? "ok" : "error";
    if (fetched.ok && String(fetched.text || "").trim()) {
      textBody = fetched.text;
    } else if (!fetched.ok) {
      lastErrorCode = "text_fetch_failed";
    }
  } else {
    storageFetchStatus = "missing";
    lastErrorCode = "missing_text_payload";
  }

  const empty = !textBody || !String(textBody).trim();
  const fetchFailed =
    !hasEnc && hasTextRef && storageFetchStatus !== "ok" && !String(textBody || "").trim();

  return {
    ok: !fetchFailed,
    textBody: textBody || "",
    hasTextRef,
    storageFetchStatus,
    metaTextLen,
    hasTextEnc: hasEnc,
    decryptStatus,
    decryptReason,
    lastErrorCode,
    fetchFailed,
    empty,
  };
}

async function clearPhoneBurstState(waNumber, deadlineIso) {
  const phone = normalizePhoneE164(waNumber);
  if (!phone) return;
  const q = supabase.from("phone_bursts").delete().eq("phone_e164", phone);
  if (deadlineIso) {
    await q.lte("deadline_at", deadlineIso);
    return;
  }
  await q;
}

async function markBurstRowsProcessed(rowIds, parentId, outcome) {
  if (!Array.isArray(rowIds) || rowIds.length === 0) return;
  const uniqueIds = Array.from(new Set(rowIds.map((x) => Number(x)).filter((x) => Number.isFinite(x))));
  if (uniqueIds.length === 0) return;

  const outcomeValue = String(outcome || "processed");
  const { error } = await supabase
    .from("inbound_events")
    .update({
      processed_at: nowIso(),
      status: "processed",
      outcome: outcomeValue,
      skip_reason: `burst_finalized_by_${parentId}`,
    })
    .in("id", uniqueIds)
    .is("processed_at", null);

  if (error) {
    console.log(`[batch] mark_rows_failed parent_id_last4=${tailN(parentId, 4)} rows=${uniqueIds.length}`);
  }
}

// -------------------- Supabase queue --------------------
async function dequeueEventJson() {
  const now = nowIso();
  const baseSelect = "id, provider, status, attempts, processed_at, outcome, skip_reason, meta, received_at, user_msg_ts, wa_message_id, from_phone, wa_number, next_attempt_at";
  const dueQueries = [
    supabase
      .from("inbound_events")
      .select(baseSelect)
      .eq("status", "pending")
      .is("processed_at", null)
      .is("next_attempt_at", null)
      .order("received_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(20),
    supabase
      .from("inbound_events")
      .select(baseSelect)
      .eq("status", "pending")
      .is("processed_at", null)
      .lte("next_attempt_at", now)
      .order("next_attempt_at", { ascending: true })
      .order("received_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(20),
  ];

  for (const q of dueQueries) {
    const { data, error } = await q;
    if (error) {
      const msg = String(error.message || error);
      console.error("[worker] dequeue error:", {
        message: msg.slice(0, 160),
        hint: msg.toLowerCase().includes("invalid api key")
          ? "Supabase rejected the key. Check Secret value, rotation, whitespace, and Cloud Run env var name."
          : null,
      });
      continue;
    }

    const candidates = Array.isArray(data) ? data : [];
    for (const candidate of candidates) {
      const currentAttempts = Number.isFinite(Number(candidate?.attempts)) ? Number(candidate.attempts) : 0;
      const { data: claimed, error: claimError } = await supabase
        .from("inbound_events")
        .update({
          status: "processing",
          attempts: currentAttempts + 1,
          processed_at: null,
        })
        .eq("id", candidate.id)
        .eq("status", "pending")
        .is("processed_at", null)
        .select(baseSelect)
        .maybeSingle();

      if (claimError) continue;
      if (claimed && claimed.id != null) return claimed;
    }
  }
  return null;
}

async function markEvent(id, patch) {
  const allowed = [
    "status",
    "processed_at",
    "locked_at",
    "attempts",
    "next_attempt_at",
    "outcome",
    "skip_reason",
    "last_error",
  ];
  const update = { processed_at: nowIso() };
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch || {}, key)) {
      update[key] = patch[key];
    }
  }
  const { error } = await supabase.from("inbound_events").update(update).eq("id", id);
  if (error) console.log("[worker] markEvent error:", String(error.message || error).slice(0, 140));
}

/**
 * Classify inbound events.
 */
function classifyWhatsAppEvent(eventRow) {
  const meta = eventRow.meta || {};
  const kind = String(meta.event_kind || "").toLowerCase();
  const msgType = String(meta.msg_type || meta.type || meta.message_type || "").toLowerCase();
  const textEnc = meta.text_enc && typeof meta.text_enc === "object" ? meta.text_enc : null;
  const textRef = meta.text_ref && typeof meta.text_ref === "object" ? meta.text_ref : null;

  const wa_number = normalizePhoneE164(
    eventRow.from_phone || eventRow.wa_number || meta.from_phone || meta.from || null
  );
  if (!wa_number) return { kind: "not_actionable" };

  if (kind === "status_event") return { kind: "status_event", wa_number };

  if (kind === "inbound_command") {
    const command = String(meta.command || "").trim();
    return { kind: "inbound_command", wa_number, command };
  }
  if (kind === "inbound_unsupported_media") return { kind: "unsupported_media", wa_number };
  if (kind === "ignored_non_text" || kind === "inbound_reaction") return { kind: "not_actionable", wa_number };

  if (kind === "inbound_text") {
    return {
      kind: "inbound_text",
      wa_number,
      text_ref: textRef,
      text_len: meta.text_len ?? null,
      text_enc: textEnc,
      text_sha256: meta.text_sha256 || null,
    };
  }

  // fallback legacy
  if (msgType === "status" || meta.status) return { kind: "status_event", wa_number };

  if (msgType === "document" || msgType === "image" || msgType === "audio" || msgType === "video" || msgType === "sticker") {
    return { kind: "unsupported_media", wa_number };
  }

  const text_body = (meta.text_body || meta.text?.body || meta.body || "").trim();
  const isTextLike = msgType === "text" || msgType === "interactive" || msgType === "button";
  if (isTextLike && (textRef || textEnc)) {
    return {
      kind: "inbound_text",
      wa_number,
      text_ref: textRef,
      text_len: meta.text_len ?? null,
      text_enc: textEnc,
      text_sha256: meta.text_sha256 || null,
    };
  }
  if (isTextLike && text_body) return { kind: "inbound_text_legacy", wa_number, text_body };

  return { kind: "not_actionable" };
}

// -------------------- Users --------------------
let _cachedFreeLimit = null;
let _cachedFreeLimitAtMs = 0;

async function getFreeLimitCached() {
  const now = Date.now();
  if (_cachedFreeLimit != null && now - _cachedFreeLimitAtMs < 60_000) return _cachedFreeLimit;

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
  const phone = normalizePhoneE164(waNumber);
  if (!phone) throw new Error("invalid_phone_e164");
  const freeLimit = await getFreeLimitCached();

  await supabase.from("users").upsert(
    {
      phone_e164: phone,
      phone_hash: hashPhone(phone),
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

  const { data, error } = await supabase.from("users").select("*").eq("phone_e164", phone).single();
  if (error) throw error;
  return data;
}

async function updateLastUserMessageAt(waNumber, tsIso) {
  const phone = normalizePhoneE164(waNumber);
  if (!phone) return;
  const stamp = safeIso(tsIso) || nowIso();
  await supabase
    .from("users")
    .update({ last_user_message_at: stamp, updated_at: nowIso() })
    .eq("phone_e164", phone);
}

// -------------------- WhatsApp send (360dialog) --------------------
async function sendWhatsAppText(toNumber, bodyText, diag = {}) {
  const url = `${D360_BASE_URL.replace(/\/$/, "")}/messages`;
  const eventId = diag?.eventId ?? "n/a";
  const normalizedTo = normalizePhoneE164(toNumber) || String(toNumber || "").trim();
  const toLast4 = tailN(normalizedTo, 4) || "n/a";

  const payload = {
    messaging_product: "whatsapp",
    to: String(normalizedTo),
    type: "text",
    text: { body: String(bodyText).slice(0, 4096) },
  };

  let status = "n/a";
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "D360-API-KEY": D360_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    status = String(resp.status);
    const ok = Boolean(resp.ok);
    console.log(`[wa_send] id=${eventId} to=${toLast4} status=${status} ok=${ok}`);

    if (!resp.ok) throw new Error(`wa_send_http_${resp.status}`);
    return { ok: true, status: resp.status };
  } catch (e) {
    if (status === "n/a") {
      console.log(`[wa_send] id=${eventId} to=${toLast4} status=n/a ok=false`);
    }
    const error = new Error(truncateErr500(e));
    error.code = "wa_send_failed";
    throw error;
  }
}

// -------------------- Legal templates --------------------
const CURRENT_TOS_VERSION = "v1";

const DIR_RTL_ISOLATE = "\u2067"; // RLI
const DIR_LTR_ISOLATE = "\u2066"; // LRI
const DIR_POP_ISOLATE = "\u2069"; // PDI
const DIR_RLM = "\u200F";
const DIR_LRM = "\u200E";
const GCC_COUNTRIES = new Set(["BH", "KW", "OM", "QA", "SA", "AE"]);
const PREFIX_TO_COUNTRY = [
  ["974", "QA"],
  ["971", "AE"],
  ["966", "SA"],
  ["965", "KW"],
  ["973", "BH"],
  ["968", "OM"],
  ["20", "EG"],
  ["34", "ES"],
  ["52", "MX"],
  ["54", "AR"],
  ["56", "CL"],
  ["57", "CO"],
  ["58", "VE"],
  ["591", "BO"],
  ["593", "EC"],
  ["595", "PY"],
  ["598", "UY"],
  ["51", "PE"],
  ["1", "US"],
];
const COUNTRY_LANG = {
  ES: "es",
  MX: "es",
  AR: "es",
  CL: "es",
  CO: "es",
  VE: "es",
  BO: "es",
  EC: "es",
  PY: "es",
  UY: "es",
  PE: "es",
};

function wrapWithDirectionMarks(text, dir) {
  const body = String(text || "");
  const isRtl = dir === "rtl";
  const isolateOpen = isRtl ? DIR_RTL_ISOLATE : DIR_LTR_ISOLATE;
  const mark = isRtl ? DIR_RLM : DIR_LRM;
  const lines = body.split("\n").map((line) => mark + line);
  return `${isolateOpen}${lines.join("\n")}${DIR_POP_ISOLATE}`;
}

function detectCountryFromWaNumber(waNumber) {
  const digits = String(waNumber || "").replace(/\D/g, "");
  for (const [prefix, country] of PREFIX_TO_COUNTRY) {
    if (digits.startsWith(prefix)) return country;
  }
  return null;
}

function getUserLangPref(user) {
  const lang = String(user?.prefs_json?.lang || "auto").toLowerCase();
  if (lang === "auto" || lang === "en" || lang === "ar" || lang === "es") return lang;
  return "auto";
}

function inferNoticeLanguages(waNumber, user) {
  const pref = getUserLangPref(user);
  if (pref !== "auto") return [pref];

  const country = detectCountryFromWaNumber(waNumber);
  if (country && GCC_COUNTRIES.has(country)) return ["ar", "en"];

  const lang = country ? COUNTRY_LANG[country] : null;
  if (lang && lang !== "en") return ["en", lang];
  return ["en"];
}

function normalizePlanLabel(user) {
  const planRaw = String(user?.plan || "").trim().toLowerCase();
  if (planRaw === "basic") return "Basic";
  if (planRaw === "pro") return "Pro";
  if (planRaw && planRaw !== "free") return planRaw.toUpperCase();
  return "FREE";
}

function buildAccountStatusLabel(user) {
  if (user?.is_blocked) {
    const reason = String(user?.blocked_reason || "").trim();
    return reason ? `BLOCKED (${reason})` : "BLOCKED";
  }
  if (user?.is_paid || String(user?.plan || "").toLowerCase() !== "free") {
    const planLabel = normalizePlanLabel(user);
    if (planLabel === "Basic" || planLabel === "Pro") return `PAID (${planLabel})`;
    return "PAID";
  }
  return "FREE";
}

function buildWelcomeEn(user) {
  const freeLeft = Number.isFinite(Number(user?.free_remaining)) ? Number(user.free_remaining) : 0;
  return [
    "👋 Welcome to Fazumi",
    "✨ Your WhatsApp summarizer is ready.",
    "",
    `🧾 Account status: ${buildAccountStatusLabel(user)}`,
    `🎁 Free summaries left: ${freeLeft}`,
    "",
    "🔒 By continuing you allow message processing for this service.",
    "⚠️ Please don't send sensitive/confidential info.",
    "⚙️ Commands: HELP, STATUS, PAY, STOP, DELETE, START, FEEDBACK, LANG EN|AR|ES|AUTO",
    // TODO: replace placeholder Terms/Privacy links with real Notion pages.
    `Terms: ${TERMS_LINK}`,
    `Privacy: ${PRIVACY_LINK}`,
  ].join("\n");
}

function buildWelcomeAr(user) {
  const freeLeft = Number.isFinite(Number(user?.free_remaining)) ? Number(user.free_remaining) : 0;
  const status = buildAccountStatusLabel(user);
  return [
    "👋 أهلا بك في فازومي",
    "✨ ملخّص واتساب الخاص بك جاهز.",
    "",
    `🧾 حالة الحساب: ${status}`,
    `🎁 الملخصات المجانية المتبقية: ${freeLeft}`,
    "",
    "🔒 بالمتابعة، أنت توافق على معالجة الرسائل لتقديم الخدمة.",
    "⚠️ رجاءً لا ترسل معلومات حساسة أو سرية.",
    "⚙️ الأوامر: HELP، STATUS، PAY، STOP، DELETE، START، FEEDBACK، LANG EN|AR|ES|AUTO",
    `الشروط: ${TERMS_LINK}`,
    `الخصوصية: ${PRIVACY_LINK}`,
  ].join("\n");
}

function buildWelcomeEs(user) {
  const freeLeft = Number.isFinite(Number(user?.free_remaining)) ? Number(user.free_remaining) : 0;
  return [
    "👋 Bienvenido a Fazumi",
    "✨ Tu resumidor de WhatsApp esta listo.",
    "",
    `🧾 Estado de cuenta: ${buildAccountStatusLabel(user)}`,
    `🎁 Resumenes gratis restantes: ${freeLeft}`,
    "",
    "🔒 Si continuas, aceptas el procesamiento de mensajes para este servicio.",
    "⚠️ Evita enviar informacion sensible o confidencial.",
    "⚙️ Comandos: HELP, STATUS, PAY, STOP, DELETE, START, FEEDBACK, LANG EN|AR|ES|AUTO",
    `Terminos: ${TERMS_LINK}`,
    `Privacidad: ${PRIVACY_LINK}`,
  ].join("\n");
}

function firstTimeNoticeV1({ waNumber, user }) {
  const langs = inferNoticeLanguages(waNumber, user);
  const sections = [];
  for (const lang of langs) {
    if (lang === "ar") sections.push(buildWelcomeAr(user));
    else if (lang === "es") sections.push(buildWelcomeEs(user));
    else sections.push(buildWelcomeEn(user));
  }
  const body = sections.join("\n\n--------------------\n\n");
  return langs.includes("ar") ? wrapWithDirectionMarks(body, "rtl") : wrapWithDirectionMarks(body, "ltr");
}

// -------------------- Commands --------------------
const KNOWN_COMMANDS = new Set([
  "HELP",
  "STATUS",
  "PAY",
  "STOP",
  "START",
  "DELETE",
  "FEEDBACK",
]);

function buildStatusMessage(user) {
  const freeLeft = Number.isFinite(Number(user?.free_remaining)) ? Number(user.free_remaining) : 0;
  const lang = getUserLangPref(user);
  return [
    `🧾 Account status: ${buildAccountStatusLabel(user)}`,
    `🎁 Free summaries left: ${freeLeft}`,
    `🌐 Language: ${lang.toUpperCase()}`,
  ].join("\n");
}

function buildPayMessage() {
  const checkoutUrl = getLemonCheckoutUrl();
  if (!checkoutUrl) {
    return [
      "💳 Upgrade your plan",
      "Choose Basic or Pro here:",
      "Checkout link is not configured yet. Admin: set LEMON_TEST_MODE and checkout URLs.",
    ].join("\n");
  }
  return ["💳 Upgrade your plan", "Choose Basic or Pro here:", checkoutUrl].join("\n");
}

const SUMMARY_UI_I18N = {
  en: {
    freeLeft: "Free left: {n}",
  },
  es: {
    freeLeft: "Gratis restantes: {n}",
  },
  ar: {
    freeLeft: "المتبقي مجانا: {n}",
  },
};

function resolveSummaryUiLang(user, summaryLang) {
  const pref = getUserLangPref(user);
  if (pref === "en" || pref === "es" || pref === "ar") return pref;
  const detected = String(summaryLang || "").toLowerCase();
  if (detected === "en" || detected === "es" || detected === "ar") return detected;
  return "en";
}

function buildFreeLeftLine(lang, count) {
  const safeLang = lang === "ar" || lang === "es" ? lang : "en";
  const tpl = SUMMARY_UI_I18N[safeLang].freeLeft;
  const rendered = tpl.replace("{n}", String(count));
  if (safeLang === "ar") {
    return wrapWithDirectionMarks(rendered, "rtl");
  }
  return rendered;
}

// -------------------- OpenAI summary wrapper --------------------
async function generateSummaryOrDryRun(inputText, eventTsIso, languageOverride) {
  const maxChars = Number(process.env.OPENAI_MAX_INPUT_CHARS || 6000);
  const prepared = buildSummarizerInputText(inputText, maxChars);
  const capped = prepared.text;

  if (DRY_RUN) return { ok: false, error_code: "dry_run_disabled" };

  const model = (process.env.OPENAI_MODEL || "unknown").trim();
  try {
    return await withConcurrency(
      async () => {
        try {
          const r = await summarizeText({
            text: capped,
            anchor_ts_iso: eventTsIso || null,
            timezone: FAZUMI_TZ,
            forced_lang: languageOverride || null,
            ui_lang: languageOverride || null,
          });
          return {
            ok: true,
            summary_text: r.summaryText,
            summary_lang: String(r.target_lang || r.raw_json?.language || "en").toLowerCase(),
            openai_model: model,
            input_tokens: r.usage?.input_tokens ?? null,
            output_tokens: r.usage?.output_tokens ?? null,
            total_tokens: r.usage?.total_tokens ?? null,
            cost_usd_est: r.cost_usd_est ?? null,
            error_code: null,
          };
        } catch (e) {
          const status = e?.status ?? e?.response?.status ?? null;
          const errType = String(e?.name || e?.constructor?.name || "").slice(0, 40);
          console.log("[openai] summary_failed", {
            code: `openai_${status || "error"}`,
            model: model || "unknown",
            ...(errType ? { err_type: errType } : {}),
          });
          return {
            ok: false,
            summary_text: null,
            summary_lang: null,
            openai_model: model,
            input_tokens: null,
            output_tokens: null,
            total_tokens: null,
            cost_usd_est: null,
            error_code: `openai_${status || "error"}`,
          };
        }
      },
      { timeoutMs: CONCURRENCY_WAIT_TIMEOUT_MS }
    );
  } catch (e) {
    if (e?.code === "concurrency_timeout") {
      return {
        ok: false,
        summary_text: null,
        summary_lang: null,
        openai_model: model,
        input_tokens: null,
        output_tokens: null,
        total_tokens: null,
        cost_usd_est: null,
        error_code: "concurrency_timeout",
        busy_reason: "concurrency_timeout",
        busy_inflight: Number.isFinite(Number(e?.inFlight)) ? Number(e.inFlight) : inFlight,
        busy_max: Number.isFinite(Number(e?.max)) ? Number(e.max) : MAX_CONCURRENCY,
        wait_ms: Number.isFinite(Number(e?.waited_ms)) ? Number(e.waited_ms) : null,
      };
    }

    const errType = String(e?.name || e?.constructor?.name || "").slice(0, 40);
    console.log("[openai] summary_failed", {
      code: "openai_error",
      model: model || "unknown",
      ...(errType ? { err_type: errType } : {}),
    });
    return {
      ok: false,
      summary_text: null,
      summary_lang: null,
      openai_model: model,
      input_tokens: null,
      output_tokens: null,
      total_tokens: null,
      cost_usd_est: null,
      error_code: "openai_error",
    };
  }
}

// ===================== Existing handlers (unchanged) =====================
const { ensureFirstTimeNoticeAndTos } = require("./legal");
const { processCommand, getLemonCheckoutUrl } = require("./commands");

// ===================== Main WhatsApp processing =====================
async function processWhatsAppText(waNumber, user, textBody, eventTsIso) {
  if (user.is_blocked) {
    await sendWhatsAppText(waNumber, "⛔ Summaries paused. Reply START to resume.");
    await updateLastUserMessageAt(waNumber, eventTsIso);
    return { action: "blocked_notice" };
  }

  await updateLastUserMessageAt(waNumber, eventTsIso);

  const meaningful = isMeaningfulText(textBody);

  // Paywall BEFORE OpenAI
  if (user.plan === "free" && meaningful && Number(user.free_remaining || 0) <= 0) {
    await sendWhatsAppText(waNumber, "You’ve used your free summaries.\nReply PAY to upgrade.");
    return { action: "paywall" };
  }

  const langPref = getUserLangPref(user);
  const forcedLang = langPref === "auto" ? null : langPref;

  const result = await generateSummaryOrDryRun(textBody, eventTsIso, forcedLang);

  if (!result.ok) {
    if (result.busy_reason) {
      const busyReason = String(result.busy_reason || "busy");
      const busyInFlight = Number.isFinite(Number(result.busy_inflight))
        ? Number(result.busy_inflight)
        : inFlight;
      const busyMax = Number.isFinite(Number(result.busy_max)) ? Number(result.busy_max) : MAX_CONCURRENCY;
      console.log(`[worker] busy_notice reason=${busyReason} inFlight=${busyInFlight} max=${busyMax}`);
      await sendWhatsAppText(waNumber, "⚠️ Sorry—summarizer is temporarily busy. Try again.");
      return { action: "summary_failed", error_code: result.error_code || null, busy_reason: busyReason };
    }

    await sendWhatsAppText(waNumber, "⚠️ Sorry—summarizer is temporarily unavailable. Try again.");
    return { action: "summary_failed", error_code: result.error_code || null };
  }

  // Send FIRST
  let outboundText = result.summary_text;
  if (user.plan === "free" && meaningful) {
    const freeLeftAfterSend = Math.max(0, Number(user.free_remaining || 0) - 1);
    const uiLang = resolveSummaryUiLang(user, result.summary_lang);
    const freeLeftLine = buildFreeLeftLine(uiLang, freeLeftAfterSend);
    outboundText = `${outboundText}\n\n${freeLeftLine}`;
  }
  await sendWhatsAppText(waNumber, outboundText);

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
async function mainLoop() {
  console.log("[worker] loop started (no HTTP)");

  let idleMs = 250;
  const idleMax = 2000;
  let lastHeartbeatMs = 0;

  while (!shouldStop) {
    const row = await dequeueEventJson();

    // heartbeat every ~60s when idle
    const now = Date.now();
    if (!row && now - lastHeartbeatMs > 60_000) {
      console.log("[worker] heartbeat", { inFlight, idleMs });
      lastHeartbeatMs = now;
    }

    if (!row) {
      idleMs = Math.min(idleMax, Math.floor(idleMs * 1.2));
      await sleep(idleMs);
      continue;
    }

    idleMs = 250;

    const { id, meta, received_at, user_msg_ts } = row;
    const msgType = String(meta?.msg_type || meta?.type || meta?.message_type || "").toLowerCase();
    const waMessageIdLast8 = tailN(row?.wa_message_id, 8) || "n/a";
    const outcomeBefore = String(row?.outcome || "null");
    const attempts = Number.isFinite(Number(row?.attempts)) ? Number(row.attempts) : 0;
    const fromLast4 = tailN(row?.from_phone || meta?.from || meta?.wa_number || "n/a", 4) || "n/a";
    console.log(`[job] start id=${id} msg_type=${msgType || "unknown"} from=${fromLast4}`);
    console.log(
      `[job] start id=${id} wa_message_id=${waMessageIdLast8} msg_type=${msgType || "unknown"} outcome_before=${outcomeBefore} attempts=${attempts}`
    );
    const classified = classifyWhatsAppEvent(row);

    const eventTsIso =
      safeIso(user_msg_ts) ||
      safeIso(meta?.user_msg_ts) ||
      safeIso(meta?.timestamp) ||
      safeIso(received_at) ||
      nowIso();
    let activeBurstKey = null;
    let activePhoneLock = null;

    try {
      const waNumber = classified.wa_number;

      if (classified.kind === "status_event") {
        await markEvent(id, { status: "processed", outcome: "status_ignored" });
        continue;
      }

      if (classified.kind === "unsupported_media") {
        await sendWhatsAppText(waNumber, "Text only supported in MVP.", { eventId: id });
        await markEvent(id, { status: "processed", outcome: "unsupported_media" });
        continue;
      }

      if (classified.kind === "not_actionable") {
        await markEvent(id, { status: "processed", outcome: "not_actionable" });
        continue;
      }

      // Ensure user exists
      let user = await resolveUser(waNumber);
      let preloadedPrimaryText = null;
      let legalInboundText =
        classified.kind === "inbound_command"
          ? classified.command
          : classified.kind === "inbound_text_legacy"
            ? classified.text_body
            : "";

      if (classified.kind === "inbound_text_legacy") {
        const maybeLegacyCommand = extractCommandText(classified.text_body || "");
        if (maybeLegacyCommand) legalInboundText = maybeLegacyCommand;
      }

      if (classified.kind === "inbound_text") {
        preloadedPrimaryText = await loadTextForClassifiedEvent(row, classified);
        const maybeCommand = extractCommandText(preloadedPrimaryText.textBody || "");
        if (maybeCommand) legalInboundText = maybeCommand;
      }

      // Legal: first-time notice and implied TOS acceptance
      const legal = await ensureFirstTimeNoticeAndTos(waNumber, user, {
        supabase,
        inbound_text: legalInboundText,
        nowIso: () => nowIso(),
        noticeText: firstTimeNoticeV1({ waNumber, user }),
        tosVersion: CURRENT_TOS_VERSION,
        sendNoticeText: async (message) => {
          await sendWhatsAppText(waNumber, message, { eventId: id });
        },
      });
      if (legal.stop) {
        await markEvent(id, { status: "processed", outcome: legal.outcome || "privacy_notice_sent" });
        continue;
      }

      // Refresh after legal patch
      user = await resolveUser(waNumber);

      // Commands
      let commandFallbackText = null;
      if (classified.kind === "inbound_command") {
        const r = await processCommand({
          waNumber,
          user,
          textBody: classified.command,
          waMessageId: row?.wa_message_id || null,
          eventTsIso,
          supabase,
          nowIso,
          sendText: async (message) => sendWhatsAppText(waNumber, message, { eventId: id }),
          buildStatusMessage,
          buildPayMessage,
        });
        if (r.handled === true) {
          await markEvent(id, { status: "processed", outcome: r.action || "command_processed" });
          continue;
        }
        commandFallbackText = String(classified.command || "").trim();
      }

      // Text
      const isTextLikeInbound = isBurstBatchEligibleKind(classified.kind);
      const primaryTextLoaded = isTextLikeInbound
        ? preloadedPrimaryText || (await loadTextForClassifiedEvent(row, classified))
        : {
            ok: false,
            textBody: "",
            hasTextRef: false,
            storageFetchStatus: null,
            metaTextLen: null,
            hasTextEnc: false,
            decryptStatus: "n/a",
            decryptReason: null,
            lastErrorCode: null,
            fetchFailed: false,
            empty: true,
          };
      let textBody = commandFallbackText || primaryTextLoaded.textBody || "";

      if (classified.kind === "inbound_text") {
        console.log(
          `[text_diag] id=${id} msg_type=${msgType || "unknown"} has_text_enc=${primaryTextLoaded.hasTextEnc} decrypt=${primaryTextLoaded.decryptStatus}${primaryTextLoaded.decryptReason ? ` reason=${primaryTextLoaded.decryptReason}` : ""} has_text_ref=${primaryTextLoaded.hasTextRef} storage_fetch=${primaryTextLoaded.storageFetchStatus || "n/a"} text_len=${String(textBody || "").trim().length}`
        );
      }

      if (isTextLikeInbound && primaryTextLoaded.fetchFailed) {
        try {
          await sendWhatsAppText(waNumber, "I couldn't access your message text. Please resend.", { eventId: id });
        } catch {
          // best effort
        }
        await markEvent(id, {
          status: "error",
          outcome: "text_fetch_failed",
          last_error: primaryTextLoaded.lastErrorCode || "text_fetch_failed",
        });
        continue;
      }

      if (isTextLikeInbound && (!textBody || !String(textBody).trim())) {
        try {
          await sendWhatsAppText(
            waNumber,
            "I received your message but couldn't read the text. Please resend as plain text.",
            { eventId: id }
          );
        } catch {
          // best effort
        }
        await markEvent(id, {
          status: "processed",
          outcome: "empty_text",
          last_error: primaryTextLoaded.lastErrorCode || null,
        });
        continue;
      }

      const extractedCommand = isTextLikeInbound ? extractCommandText(textBody) : null;
      if (extractedCommand) {
        const r = await processCommand({
          waNumber,
          user,
          textBody: extractedCommand,
          waMessageId: row?.wa_message_id || null,
          eventTsIso,
          supabase,
          nowIso,
          sendText: async (message) => sendWhatsAppText(waNumber, message, { eventId: id }),
          buildStatusMessage,
          buildPayMessage,
        });
        if (r.handled === true) {
          await markEvent(id, { status: "processed", outcome: r.action || "command_processed" });
          continue;
        }
      }

      let burstRowIdsToFinalize = [];
      let burstSummaryMessageCount = 0;
      let burstDeadlineIso = null;
      if (isTextLikeInbound) {
        const lockOwner = `job_${id}`;
        const lock = await tryClaimPhoneBurstLock(waNumber, lockOwner);
        if (!lock.claimed) {
          await deferDueToPhoneLock(id);
          continue;
        }
        activePhoneLock = { waNumber, lockOwner };

        const burst = await buildBurstBatch(row, classified, textBody);
        if (!burst.ok && burst.waitUntilIso) {
          console.log(
            `[batch] wait phone=${tailN(burst.waNumber || waNumber, 4)} leader_id=${burst.leaderId || id} now=${burst.nowIso || nowIso()} deadline=${burst.deadlineIso || burst.waitUntilIso}`
          );
          await rescheduleLeaderForBurstDeadline(id, burst.waitUntilIso);
          continue;
        }
        if (!burst.ok && burst.alreadySent) {
          await markEvent(id, {
            status: "processed",
            outcome: "burst_already_finalized",
            skip_reason: burst.burstKey || null,
          });
          continue;
        }
        activeBurstKey = String(burst.burstKey || "").trim() || null;
        burstDeadlineIso = safeIso(burst.deadlineIso) || null;
        textBody = String(burst.textBody || textBody || "");
        burstRowIdsToFinalize = Array.isArray(burst.burstRowIds)
          ? burst.burstRowIds.filter((x) => Number.isFinite(Number(x))).map((x) => Number(x))
          : [Number(id)];
        burstSummaryMessageCount = Number.isFinite(Number(burst.burstMessageCount))
          ? Number(burst.burstMessageCount)
          : 0;

        console.log(
          `[batch] finalize phone=${tailN(burst.waNumber || waNumber, 4)} leader_id=${burst.leaderId || id} row_count=${burstRowIdsToFinalize.length} message_count=${burstSummaryMessageCount} total_chars=${String(textBody || "").length}`
        );
      }

      const r = await processWhatsAppText(waNumber, user, textBody, eventTsIso);
      if (activeBurstKey && r.action !== "summary_sent") {
        await releaseBurstSendToken(activeBurstKey);
      }

      if (isTextLikeInbound && burstRowIdsToFinalize.length > 0) {
        await markBurstRowsProcessed(burstRowIdsToFinalize, id, r.action || "processed");
      }
      if (isTextLikeInbound) {
        await clearPhoneBurstState(waNumber, burstDeadlineIso);
      }

      if (isTextLikeInbound) {
        continue;
      }

      await markEvent(id, {
        status: "processed",
        outcome: r.action || "processed",
        skip_reason: r.skip_reason || null,
      });
    } catch (e) {
      if (typeof activeBurstKey === "string" && activeBurstKey) {
        await releaseBurstSendToken(activeBurstKey);
      }
      await markEvent(id, {
        status: "error",
        outcome: "worker_error",
        last_error: truncateErr500(e),
      });
      console.log("[worker] non-fatal loop error:", String(e?.message || e).slice(0, 200));
    } finally {
      if (activePhoneLock?.waNumber && activePhoneLock?.lockOwner) {
        await releasePhoneBurstLock(activePhoneLock.waNumber, activePhoneLock.lockOwner);
      }
    }
  }

  console.log("[worker] loop stopped");
}

mainLoop().catch((e) => {
  console.error("[worker] fatal:", truncateErr500(e));
  process.exit(1);
});
