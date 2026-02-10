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
 * - Legacy: decrypts meta.text_enc, uses it, then wipes it (best-effort)
 */

"use strict";

require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const JSZip = require("jszip");

// ---- WORKER VERSION FINGERPRINT ----
const WORKER_VERSION = "p5-workerpool-zip-ingest-mvp-2026-02-06a";

// ---- OpenAI summarizer (CommonJS) ----
let summarizeText = null;
try {
  ({ summarizeText } = require("./openai_summarizer"));
} catch (e) {
  summarizeText = null; // ok if DRY_RUN=true
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
const CHAT_EXPORTS_BUCKET = envTrim("CHAT_EXPORTS_BUCKET") || "chat-exports";
const MEDIA_MAX_BYTES = Number(envTrim("MEDIA_MAX_BYTES") || 20 * 1024 * 1024);
const ZIP_MAX_BYTES = Number(envTrim("ZIP_MAX_BYTES") || MEDIA_MAX_BYTES);
const ZIP_MAX_TEXT_CHARS = Number(envTrim("ZIP_MAX_TEXT_CHARS") || 1_200_000);

// Templates (kept for future proactive messaging; not used for inbound-triggered replies)
const D360_TEMPLATE_LANG = envTrim("D360_TEMPLATE_LANG") || "en";
const HELLO_TEMPLATE_NAME = envTrim("HELLO_TEMPLATE_NAME") || "hello_fazumi";
const WHATSAPP_WINDOW_HOURS = Number(envTrim("WHATSAPP_WINDOW_HOURS") || 24);

// Payments
const LEMON_CHECKOUT_URL = envTrim("LEMON_CHECKOUT_URL") || "";

// Timezone
const FAZUMI_TZ = envTrim("FAZUMI_TZ") || "Asia/Qatar";

// Runtime controls
const DRY_RUN = String(process.env.DRY_RUN || "true").toLowerCase() !== "false";
const BATCH_INITIAL_WAIT_MS = parseIntEnv(envTrim("BATCH_INITIAL_WAIT_MS"), 1800, 0);
const BATCH_MAX_WINDOW_MS = parseIntEnv(envTrim("BATCH_MAX_WINDOW_MS"), 12000, 0);
const BATCH_QUIET_MS = parseIntEnv(envTrim("BATCH_QUIET_MS"), 2000, 0);
const BATCH_POLL_MS = 400;

// Legal links (don’t invent links)
const TERMS_LINK = envTrim("TERMS_LINK") || "Terms/Privacy pages coming soon.";
const PRIVACY_LINK = envTrim("PRIVACY_LINK") || "Terms/Privacy pages coming soon.";
const ZIP_ACCEPT_MIME_TYPES = new Set(["application/zip", "application/x-zip-compressed"]);

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
if (!DRY_RUN && typeof summarizeText !== "function") {
  console.error("[worker] DRY_RUN=false but openai_summarizer not loadable.");
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

function startsLikeJson(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 1) return false;
  let i = 0;
  while (i < buf.length && (buf[i] === 0x20 || buf[i] === 0x09 || buf[i] === 0x0a || buf[i] === 0x0d)) i++;
  if (i >= buf.length) return false;
  return buf[i] === 0x7b || buf[i] === 0x5b; // { or [
}

function safeUrlForLog(rawUrl) {
  try {
    const u = new URL(String(rawUrl || ""));
    return {
      host: u.host || "n/a",
      path: u.pathname || "/",
    };
  } catch {
    return { host: "n/a", path: "n/a" };
  }
}

function get360MediaMetaEndpoint(mediaId) {
  return `${D360_BASE_URL.replace(/\/$/, "")}/${encodeURIComponent(String(mediaId || ""))}`;
}

function rewriteMediaDownloadUrlToD360(downloadUrl) {
  const source = new URL(String(downloadUrl || ""));
  const d360 = new URL(D360_BASE_URL);
  return `${d360.origin}${source.pathname}${source.search}`;
}

// -------------------- PII-safe helpers --------------------
function hashPhone(phoneE164) {
  return crypto.createHash("sha256").update(String(phoneE164), "utf8").digest("hex");
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

function buildLemonCheckoutUrl(waNumber) {
  if (!LEMON_CHECKOUT_URL) throw new Error("Missing LEMON_CHECKOUT_URL");
  const u = new URL(LEMON_CHECKOUT_URL);
  u.searchParams.set("checkout[custom][wa_number]", String(waNumber));
  return u.toString();
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

async function fetchPendingBurstRows(waNumber, primaryId, windowStartIso, windowEndIso) {
  if (!waNumber || !windowStartIso || !windowEndIso) return [];

  const { data, error } = await supabase
    .from("inbound_events")
    .select("id, meta, received_at, user_msg_ts, wa_message_id, from_phone, wa_number, status, provider")
    .eq("provider", "whatsapp")
    .eq("status", "pending")
    .eq("from_phone", waNumber)
    .neq("id", primaryId)
    .gte("received_at", windowStartIso)
    .lte("received_at", windowEndIso)
    .order("received_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(80);

  if (error) {
    console.log(`[batch] fetch_error primary_id_last4=${tailN(primaryId, 4)} msg=${truncateErr500(error)}`);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

async function collectBurstExtraRows(primaryRow, primaryClassified) {
  if (!isBurstBatchEligibleKind(primaryClassified?.kind)) return [];

  const waNumber = primaryClassified.wa_number || primaryRow?.from_phone || primaryRow?.wa_number || null;
  if (!waNumber) return [];

  const primaryReceivedIso = safeIso(primaryRow?.received_at) || nowIso();
  const primaryReceivedMs = isoToMsOrNull(primaryReceivedIso) ?? Date.now();
  const maxWindowEndMs = primaryReceivedMs + BATCH_MAX_WINDOW_MS;

  if (BATCH_INITIAL_WAIT_MS > 0) {
    const waitMs = Math.max(0, Math.min(BATCH_INITIAL_WAIT_MS, maxWindowEndMs - Date.now()));
    if (waitMs > 0) await sleep(waitMs);
  }

  const seen = new Set();
  const extras = [];
  let lastNewAtMs = null;
  let firstPoll = true;

  while (!shouldStop) {
    const nowMs = Date.now();
    const upperBoundMs = Math.min(nowMs, maxWindowEndMs);
    const upperBoundIso = new Date(upperBoundMs).toISOString();

    const rows = await fetchPendingBurstRows(waNumber, primaryRow.id, primaryReceivedIso, upperBoundIso);
    let newCount = 0;
    for (const row of rows) {
      const idKey = String(row?.id ?? "");
      if (!idKey || seen.has(idKey)) continue;

      const classified = classifyWhatsAppEvent(row);
      if (!isBurstBatchEligibleKind(classified.kind)) continue;

      seen.add(idKey);
      extras.push(row);
      newCount++;
    }

    if (newCount > 0) lastNewAtMs = Date.now();

    if (firstPoll) {
      firstPoll = false;
      if (newCount === 0) break;
    }

    const reachedMaxWindow = Date.now() >= maxWindowEndMs;
    const quietElapsed =
      lastNewAtMs != null && BATCH_QUIET_MS >= 0 ? Date.now() - lastNewAtMs >= BATCH_QUIET_MS : false;
    if (reachedMaxWindow || quietElapsed) break;

    await sleep(BATCH_POLL_MS);
  }

  extras.sort((a, b) => {
    const aMs = isoToMsOrNull(a?.received_at) ?? 0;
    const bMs = isoToMsOrNull(b?.received_at) ?? 0;
    if (aMs !== bMs) return aMs - bMs;
    return Number(a?.id || 0) - Number(b?.id || 0);
  });
  return extras;
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
      fetchFailed: false,
      empty: true,
    };
  }

  let textBody = null;
  const hasTextRef = Boolean(classified.text_ref?.bucket && classified.text_ref?.path);
  let storageFetchStatus = null;
  const metaTextLen = Number.isFinite(Number(row?.meta?.text_len)) ? Number(row.meta.text_len) : null;

  if (hasTextRef) {
    const fetched = await downloadInboundTextFromStorage(classified.text_ref);
    storageFetchStatus = fetched.ok ? "ok" : "error";
    if (fetched.ok) textBody = fetched.text;
  } else {
    storageFetchStatus = "error";
    if (classified.text_enc) textBody = decryptTextEncOrNull(classified.text_enc);
  }

  const empty = !textBody || !String(textBody).trim();
  const fetchFailed = hasTextRef && storageFetchStatus !== "ok";

  return {
    ok: !fetchFailed,
    textBody: textBody || "",
    hasTextRef,
    storageFetchStatus,
    metaTextLen,
    fetchFailed,
    empty,
  };
}

async function markBatchedChildrenProcessed(extraRows, parentId) {
  for (const child of extraRows) {
    const childId = child?.id;
    if (childId == null) continue;
    try {
      const { error } = await supabase
        .from("inbound_events")
        .update({
          processed_at: nowIso(),
          status: "processed",
          outcome: "batched_child",
          skip_reason: `batched_to_${parentId}`,
        })
        .eq("id", childId)
        .eq("status", "pending");
      if (error) {
        console.log(
          `[batch] child_mark_error parent_id_last4=${tailN(parentId, 4)} child_id_last4=${tailN(childId, 4)}`
        );
      }
    } catch {
      console.log(
        `[batch] child_mark_error parent_id_last4=${tailN(parentId, 4)} child_id_last4=${tailN(childId, 4)}`
      );
    }

    await wipeInboundEventTextEnc(childId);
  }
}

// -------------------- Supabase queue --------------------
async function dequeueEventJson() {
  const { data, error } = await supabase.rpc("dequeue_inbound_event_json");

  if (error) {
    const msg = String(error.message || error);
    // keep logs minimal + useful
    console.error("[worker] dequeue error:", {
      message: msg.slice(0, 160),
      hint: msg.toLowerCase().includes("invalid api key")
        ? "Supabase rejected the key. Check Secret value, rotation, whitespace, and Cloud Run env var name."
        : null,
    });
    return null;
  }

  if (!data || data.id == null) return null;
  return data;
}

async function markEvent(id, patch) {
  const update = { processed_at: nowIso(), ...patch };
  const { error } = await supabase.from("inbound_events").update(update).eq("id", id);
  if (error) console.log("[worker] markEvent error:", String(error.message || error).slice(0, 140));
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
      text_ref: meta.text_ref || null,
      text_len: meta.text_len ?? null,
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
  await supabase
    .from("users")
    .update({ last_user_message_at: stamp, updated_at: nowIso() })
    .eq("phone_e164", waNumber);
}

// -------------------- WhatsApp send (360dialog) --------------------
async function sendWhatsAppText(toNumber, bodyText, diag = {}) {
  const url = `${D360_BASE_URL.replace(/\/$/, "")}/messages`;
  const eventId = diag?.eventId ?? "n/a";
  const toLast4 = tailN(toNumber, 4) || "n/a";

  const payload = {
    messaging_product: "whatsapp",
    to: String(toNumber),
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

// -------------------- ZIP media handling (MVP) --------------------
function normalizeDocShaToHex(v) {
  const raw = String(v || "").trim();
  if (!raw) return crypto.createHash("sha256").update("missing", "utf8").digest("hex");
  if (/^[a-fA-F0-9]{64}$/.test(raw)) return raw.toLowerCase();

  try {
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = b64.length % 4 === 0 ? 0 : 4 - (b64.length % 4);
    const padded = b64 + "=".repeat(padLen);
    const decoded = Buffer.from(padded, "base64");
    if (decoded.length === 32) return decoded.toString("hex");
  } catch {
    // ignore
  }

  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

function isAcceptedZipDocument(doc) {
  const mime = String(doc?.mime_type || "").toLowerCase().trim();
  const filename = String(doc?.filename || "").toLowerCase().trim();
  if (filename.endsWith(".zip")) return true;
  if (ZIP_ACCEPT_MIME_TYPES.has(mime)) return true;
  return mime.includes("zip");
}

function safeStorageUserPart(userId) {
  const raw = userId == null ? "unknown" : String(userId);
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  return safe || "unknown";
}

async function get360MediaDownloadUrl(mediaId) {
  const endpoint = get360MediaMetaEndpoint(mediaId);
  const resp = await fetch(endpoint, {
    method: "GET",
    headers: {
      "D360-API-KEY": D360_API_KEY,
    },
  });

  const payload = await resp.json().catch(() => null);
  const url = payload?.url || payload?.data?.url || null;
  const mime = String(payload?.mime_type || payload?.data?.mime_type || "").toLowerCase() || "n/a";
  const sizeRaw = payload?.file_size ?? payload?.data?.file_size ?? null;
  const size = Number.isFinite(Number(sizeRaw)) ? Number(sizeRaw) : null;
  const sha = String(payload?.sha256 || payload?.data?.sha256 || "");
  const sha8 = sha ? sha.slice(0, 8) : "n/a";

  return {
    status: resp.status,
    ok: resp.ok,
    url: url ? String(url) : null,
    mime,
    size,
    sha8,
  };
}

async function downloadMediaBytes(downloadUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const resp = await fetch(downloadUrl, {
      method: "GET",
      headers: {
        "D360-API-KEY": D360_API_KEY,
      },
      signal: controller.signal,
      redirect: "follow",
    });
    const ct = String(resp.headers.get("content-type") || "").toLowerCase();
    const buf = resp.ok ? Buffer.from(await resp.arrayBuffer()) : Buffer.alloc(0);
    return { status: resp.status, ok: resp.ok, bytes: buf, contentType: ct || "n/a" };
  } finally {
    clearTimeout(timeout);
  }
}

async function pickBestTxtFromZip(zipBytes) {
  const zip = await JSZip.loadAsync(zipBytes);
  const allFiles = Object.values(zip.files).filter((f) => !f.dir);
  const txtFiles = allFiles.filter((f) => /\.txt$/i.test(f.name || ""));
  if (!txtFiles.length) {
    const e = new Error("zip_no_txt");
    e.entries = allFiles.length;
    throw e;
  }

  let best = null;
  for (const f of txtFiles) {
    const name = String(f.name || "");
    const preferred = /_chat\.txt$/i.test(name) || /whatsapp chat/i.test(name) ? 1 : 0;
    const buf = Buffer.from(await f.async("uint8array"));
    if (
      !best ||
      preferred > best.preferred ||
      (preferred === best.preferred && buf.length > best.buf.length)
    ) {
      best = { name, buf, preferred };
    }
  }

  if (!best || !best.buf) {
    const e = new Error("zip_txt_select_failed");
    e.entries = allFiles.length;
    throw e;
  }

  let text = best.buf.toString("utf8");
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  if (replacementCount > Math.max(8, Math.floor(text.length * 0.005))) {
    text = best.buf.toString("latin1");
  }
  if (text.length > ZIP_MAX_TEXT_CHARS) {
    text = text.slice(0, ZIP_MAX_TEXT_CHARS);
  }

  return {
    entries: allFiles.length,
    text,
    textChars: text.length,
  };
}

async function upsertChatExportBestEffort(row, storagePath, shaHex, txtBytes) {
  try {
    const payload = {
      inbound_event_id: row?.id ?? null,
      user_id: row?.user_id ?? null,
      wa_message_id: row?.msg_id ?? null,
      storage_path: storagePath,
      document_sha256: shaHex,
      txt_bytes: Number(txtBytes || 0),
      updated_at: nowIso(),
    };
    const { error } = await supabase.from("chat_exports").upsert(payload, { onConflict: "inbound_event_id" });
    if (error) {
      const code = String(error.code || "");
      const msg = String(error.message || error);
      if (code === "42P01" || /relation .*chat_exports.* does not exist/i.test(msg)) return false;
      if (code === "42703" || /column .* does not exist/i.test(msg)) return false;
      console.log("[zip] chat_exports upsert skipped:", msg.slice(0, 120));
      return false;
    }
    return true;
  } catch (e) {
    console.log("[zip] chat_exports upsert error:", String(e?.message || e).slice(0, 120));
    return false;
  }
}

async function handleInboundMedia(waNumber, classified, row) {
  const doc = classified?.document || null;
  const media = classified?.media || null;
  const eventId = row?.id;
  const msgType = String(row?.meta?.msg_type || "").toLowerCase();

  // Non-document media: explicit refusal path.
  if (!doc && media) {
    try {
      await sendWhatsAppText(
        waNumber,
        "Supported: WhatsApp Export Chat ZIP (Without media).",
        { eventId }
      );
      return { action: "refused_non_zip", skip_reason: "non_document_media" };
    } catch (e) {
      return { action: "wa_send_failed", skip_reason: "non_document_media", error: truncateErr500(e) };
    }
  }

  if (msgType !== "document" && !doc) {
    return { action: "media_skipped", skip_reason: "not_document_event" };
  }

  const mimeType = String(doc?.mime_type || "").toLowerCase().trim();
  const filename = String(doc?.filename || "");
  const filenameLen = filename.length;
  const mediaId = String(doc?.media_id || "").trim();
  const mediaIdLast6 = tailN(mediaId, 6) || "n/a";
  const shaHex = normalizeDocShaToHex(doc?.sha256);
  const sha8 = shaHex.slice(0, 8) || "unknown";
  const d360ApiKeyPresent = !!D360_API_KEY;
  console.log(
    `[zip] id=${eventId} mime=${mimeType || "unknown"} filename_len=${filenameLen} media_id=${mediaIdLast6} sha8=${sha8}`
  );

  const isZip = isAcceptedZipDocument(doc);
  if (!isZip) {
    try {
      await sendWhatsAppText(
        waNumber,
        "Supported: WhatsApp Export Chat ZIP (Without media).",
        { eventId }
      );
      return { action: "refused_non_zip", skip_reason: "unsupported_document_type" };
    } catch (e) {
      return { action: "wa_send_failed", skip_reason: "unsupported_document_type", error: truncateErr500(e) };
    }
  }

  if (DRY_RUN) {
    return { action: "dry_run", skip_reason: "dry_run_no_send_no_download" };
  }

  const DOWNLOAD_FAIL_MSG =
    "⚠️ ZIP received, but I couldn't download it (auth error). Please retry in a few minutes.";
  const ZIP_TOO_LARGE_MSG = "⚠️ ZIP too large to process. Please export without media and try again.";

  const sendZipFailureReply = async (code) => {
    try {
      await sendWhatsAppText(waNumber, DOWNLOAD_FAIL_MSG, { eventId });
      if (code) console.log(`[zip] id=${eventId} failure_code=${String(code).slice(0, 32)}`);
    } catch {
      // Best effort; primary failure outcome still returned.
    }
  };

  const sendZipTooLargeReply = async () => {
    try {
      await sendWhatsAppText(waNumber, ZIP_TOO_LARGE_MSG, { eventId });
    } catch {
      // Best effort; primary failure outcome still returned.
    }
  };

  if (!mediaId) {
    await sendZipFailureReply("missing_media_id");
    return { action: "media_not_found", skip_reason: "missing_media_id", error: "missing_media_id" };
  }

  const fetchMediaMetaLogged = async () => {
    const endpoint = get360MediaMetaEndpoint(mediaId);
    const endpointSafe = safeUrlForLog(endpoint);
    console.log(
      `[media] step=meta_fetch outcome=attempt id=${eventId} status=n/a url_host=${endpointSafe.host} url_path=${endpointSafe.path} d360_api_key_present=${d360ApiKeyPresent}`
    );
    try {
      const mediaMeta = await get360MediaDownloadUrl(mediaId);
      const metaSafe = mediaMeta?.url ? safeUrlForLog(mediaMeta.url) : endpointSafe;
      const outcome = mediaMeta.ok && mediaMeta.url ? "ok" : "error";
      console.log(
        `[media] step=meta_fetch outcome=${outcome} id=${eventId} status=${mediaMeta.status} url_host=${metaSafe.host} url_path=${metaSafe.path} d360_api_key_present=${d360ApiKeyPresent}`
      );
      return mediaMeta;
    } catch (e) {
      console.log(
        `[media] step=meta_fetch outcome=error id=${eventId} status=n/a url_host=${endpointSafe.host} url_path=${endpointSafe.path} d360_api_key_present=${d360ApiKeyPresent}`
      );
      throw e;
    }
  };

  const tryDownloadFromMeta = async (mediaMeta) => {
    if (!mediaMeta.ok || !mediaMeta.url) return { ok: false, failCode: mediaMeta.status, reason: "meta_unusable" };
    if (Number.isFinite(mediaMeta.size) && mediaMeta.size > MEDIA_MAX_BYTES) {
      return { ok: false, failCode: "too_large", reason: "media_too_large_meta" };
    }
    if (Number.isFinite(mediaMeta.size) && mediaMeta.size > ZIP_MAX_BYTES) {
      return { ok: false, failCode: "too_large", reason: "zip_too_large_meta" };
    }
    let downloadUrl = null;
    try {
      downloadUrl = rewriteMediaDownloadUrlToD360(mediaMeta.url);
    } catch {
      return { ok: false, failCode: "bad_url", reason: "meta_download_url_invalid" };
    }
    const downloadSafe = safeUrlForLog(downloadUrl);
    console.log(
      `[media] step=file_download outcome=attempt id=${eventId} status=n/a bytes_len=null url_host=${downloadSafe.host} url_path=${downloadSafe.path} d360_api_key_present=${d360ApiKeyPresent}`
    );
    let dl;
    try {
      dl = await downloadMediaBytes(downloadUrl);
    } catch (e) {
      const msg = String(e?.message || e);
      const m = msg.match(/(\d{3})/);
      const status = m ? m[1] : "n/a";
      console.log(
        `[media] step=file_download outcome=error id=${eventId} status=${status} bytes_len=null url_host=${downloadSafe.host} url_path=${downloadSafe.path} d360_api_key_present=${d360ApiKeyPresent}`
      );
      return { ok: false, failCode: "n/a", reason: "download_exception" };
    }
    if (!dl.ok) {
      console.log(
        `[media] step=file_download outcome=error id=${eventId} status=${dl.status} bytes_len=null url_host=${downloadSafe.host} url_path=${downloadSafe.path} d360_api_key_present=${d360ApiKeyPresent}`
      );
      return { ok: false, failCode: dl.status, reason: "dl_not_ok" };
    }
    if (dl.bytes.length > MEDIA_MAX_BYTES) {
      console.log(
        `[media] step=file_download outcome=error id=${eventId} status=${dl.status} bytes_len=${dl.bytes.length} url_host=${downloadSafe.host} url_path=${downloadSafe.path} d360_api_key_present=${d360ApiKeyPresent}`
      );
      return { ok: false, failCode: "too_large", reason: "media_too_large_bytes" };
    }
    if (dl.bytes.length > ZIP_MAX_BYTES) {
      console.log(
        `[media] step=file_download outcome=error id=${eventId} status=${dl.status} bytes_len=${dl.bytes.length} url_host=${downloadSafe.host} url_path=${downloadSafe.path} d360_api_key_present=${d360ApiKeyPresent}`
      );
      return { ok: false, failCode: "too_large", reason: "zip_too_large_bytes" };
    }
    if (dl.contentType.includes("json") || startsLikeJson(dl.bytes)) {
      console.log(
        `[media] step=file_download outcome=error id=${eventId} status=${dl.status} bytes_len=${dl.bytes.length} url_host=${downloadSafe.host} url_path=${downloadSafe.path} d360_api_key_present=${d360ApiKeyPresent}`
      );
      return { ok: false, failCode: dl.status, reason: "downloaded_json" };
    }
    console.log(
      `[media] step=file_download outcome=ok id=${eventId} status=${dl.status} bytes_len=${dl.bytes.length} url_host=${downloadSafe.host} url_path=${downloadSafe.path} d360_api_key_present=${d360ApiKeyPresent}`
    );
    return { ok: true, bytes: dl.bytes };
  };

  let zipBytes = null;
  let failCode = "n/a";
  try {
    let mediaMeta = await fetchMediaMetaLogged();
    let downloadAttempt = await tryDownloadFromMeta(mediaMeta);

    if (!downloadAttempt.ok && (downloadAttempt.failCode === 401 || downloadAttempt.failCode === 404)) {
      mediaMeta = await fetchMediaMetaLogged();
      downloadAttempt = await tryDownloadFromMeta(mediaMeta);
    }

    if (!downloadAttempt.ok) {
      failCode = String(downloadAttempt.failCode ?? "n/a");
      if (failCode === "too_large") {
        await sendZipTooLargeReply();
        return {
          action: "media_too_large",
          skip_reason: downloadAttempt.reason || "media_too_large",
          error: "zip_too_large",
        };
      }
      if (failCode === "401") {
        await sendZipFailureReply(failCode);
        return {
          action: "media_download_401",
          skip_reason: downloadAttempt.reason || "media_download_401",
          error: "media_download_401",
        };
      }
      await sendZipFailureReply(failCode);
      return {
        action: "media_download_failed",
        skip_reason: downloadAttempt.reason || "media_download_failed",
        error: `media_download_failed_${failCode}`,
      };
    }

    zipBytes = downloadAttempt.bytes;
  } catch (e) {
    const m = String(e?.message || e);
    const statusMatch = m.match(/(\d{3})/);
    failCode = statusMatch ? statusMatch[1] : "n/a";
    await sendZipFailureReply(failCode);
    return {
      action: "media_download_failed",
      skip_reason: "media_download_exception",
      error: truncateErr500(e),
    };
  }

  if (zipBytes.length < 2 || zipBytes[0] !== 0x50 || zipBytes[1] !== 0x4b) {
    await sendZipFailureReply("zip_magic_mismatch");
    return { action: "zip_bad", skip_reason: "zip_magic_mismatch", error: "zip_signature_invalid" };
  }

  let parsed = null;
  console.log(
    `[zip] step=unzip outcome=attempt id=${eventId} file_count=null extracted_text_len=null`
  );
  try {
    parsed = await pickBestTxtFromZip(zipBytes);
    const entryCount = Number.isFinite(Number(parsed?.entries)) ? Number(parsed.entries) : "?";
    const textChars = Number.isFinite(Number(parsed?.textChars)) ? Number(parsed.textChars) : 0;
    console.log(
      `[zip] step=unzip outcome=ok id=${eventId} file_count=${entryCount} extracted_text_len=${textChars}`
    );
  } catch (e) {
    const fileCount = Number.isFinite(Number(e?.entries)) ? Number(e.entries) : "null";
    console.log(
      `[zip] step=unzip outcome=error id=${eventId} file_count=${fileCount} extracted_text_len=null`
    );
    await sendZipFailureReply("unzip_failed");
    return { action: "zip_parse_failed", skip_reason: "unzip_failed", error: truncateErr500(e) };
  }

  if (!parsed || !parsed.text || parsed.text.length < 1) {
    console.log(
      `[zip] step=unzip outcome=error id=${eventId} file_count=${Number.isFinite(Number(parsed?.entries)) ? Number(parsed.entries) : "null"} extracted_text_len=null`
    );
    await sendZipFailureReply("zip_no_txt");
    return { action: "zip_parse_failed", skip_reason: "zip_no_txt", error: "zip_no_txt" };
  }

  const storagePath = `chat_exports/${row?.id}.txt`;
  const textBuf = Buffer.from(parsed.text, "utf8");
  const { error: uploadErr } = await supabase.storage.from(CHAT_EXPORTS_BUCKET).upload(storagePath, textBuf, {
    upsert: true,
    contentType: "text/plain; charset=utf-8",
  });
  if (uploadErr) {
    return {
      action: "zip_parse_failed",
      skip_reason: "zip_upload_failed",
      error: truncateErr500(uploadErr?.message || uploadErr),
    };
  }
  await upsertChatExportBestEffort(row, storagePath, shaHex, textBuf.length);

  try {
    await sendWhatsAppText(
      waNumber,
      "✅ ZIP received. I saved the chat text. Now ask: What did X say about Y?",
      { eventId }
    );
  } catch (e) {
    return { action: "wa_send_failed", skip_reason: null, error: truncateErr500(e) };
  }

  return {
    action: "zip_parsed",
    skip_reason: null,
    metaPatch: { zip_txt_path: storagePath },
  };
}

// -------------------- Legal templates --------------------
const CURRENT_TOS_VERSION = "v1";

function firstTimeNoticeV1() {
  return (
    "👋 Welcome to Fazumi.\n" +
    "I can summarize messages you send here.\n" +
    "By continuing, you allow message processing to provide this service.\n" +
    "Please don’t send sensitive or confidential information.\n" +
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
  const prepared = buildSummarizerInputText(inputText, maxChars);
  const capped = prepared.text;

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

  const model = (process.env.OPENAI_MODEL || "unknown").trim();
  try {
    return await withConcurrency(
      async () => {
        try {
          const r = await summarizeText({
            text: capped,
            anchor_ts_iso: eventTsIso || null,
            timezone: FAZUMI_TZ,
          });
          return {
            ok: true,
            summary_text: r.summaryText,
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
const { processCommand } = require("./commands");

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

  const result = await generateSummaryOrDryRun(textBody, eventTsIso);

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
  await sendWhatsAppText(waNumber, result.summary_text);

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
      const legalInboundText =
        classified.kind === "inbound_command"
          ? classified.command
          : classified.kind === "inbound_text_legacy"
            ? classified.text_body
            : "";

      // Legal: first-time notice and implied TOS acceptance
      const legal = await ensureFirstTimeNoticeAndTos(waNumber, user, {
        supabase,
        inbound_text: legalInboundText,
        nowIso: () => nowIso(),
        noticeText: firstTimeNoticeV1(),
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
      if (classified.kind === "inbound_command") {
        const r = await processCommand(waNumber, user, classified.command, eventTsIso);
        await markEvent(id, { status: "processed", outcome: r.action || "command_processed" });
        continue;
      }

      // Media
      if (classified.kind === "inbound_media") {
        const r = await handleInboundMedia(waNumber, classified, row);
        if (
          r.action === "media_download_401" ||
          r.action === "media_download_invalid" ||
          r.action === "media_not_found" ||
          r.action === "media_meta_failed" ||
          r.action === "media_download_failed" ||
          r.action === "media_download_bad_content" ||
          r.action === "media_too_large" ||
          r.action === "zip_bad" ||
          r.action === "zip_store_failed" ||
          r.action === "zip_parse_failed"
        ) {
          await markEvent(id, {
            status: "error",
            outcome: r.action,
            skip_reason: r.skip_reason || null,
            last_error: truncateErr500(r.error || r.action),
            meta: r.metaPatch ? { ...(meta || {}), ...r.metaPatch } : meta || null,
          });
          continue;
        }
        if (r.action === "wa_send_failed") {
          await markEvent(id, {
            status: "error",
            outcome: "wa_send_failed",
            skip_reason: r.skip_reason || null,
            last_error: truncateErr500(r.error || "wa_send_failed"),
            meta: r.metaPatch ? { ...(meta || {}), ...r.metaPatch } : meta || null,
          });
          continue;
        }
        await markEvent(id, {
          status: "processed",
          outcome: r.action || "media_processed",
          skip_reason: r.skip_reason || null,
          meta: r.metaPatch ? { ...(meta || {}), ...r.metaPatch } : meta || null,
        });
        continue;
      }

      // Text
      const isTextLikeInbound = isBurstBatchEligibleKind(classified.kind);
      const primaryTextLoaded = await loadTextForClassifiedEvent(row, classified);
      let textBody = primaryTextLoaded.textBody || "";

      if (classified.kind === "inbound_text") {
        console.log(
          `[text_diag] id=${id} msg_type=${msgType || "unknown"} text_len=${primaryTextLoaded.metaTextLen ?? "null"} has_text_ref=${primaryTextLoaded.hasTextRef} storage_fetch=${primaryTextLoaded.storageFetchStatus === "ok" ? "ok" : "error"}`
        );
      }

      if (isTextLikeInbound && primaryTextLoaded.fetchFailed) {
        try {
          await sendWhatsAppText(waNumber, "I couldn't access your message text. Please resend.", { eventId: id });
        } catch {
          // best effort
        }
        await markEvent(id, { status: "error", outcome: "text_fetch_failed" });
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
        await markEvent(id, { status: "processed", outcome: "empty_text" });
        continue;
      }

      const normalized = normalizeInboundText(textBody);
      if (KNOWN_COMMANDS.has(normalized)) {
        const r = await processCommand(waNumber, user, normalized, eventTsIso);
        await markEvent(id, { status: "processed", outcome: r.action || "command_processed" });
        continue;
      }

      let collectedExtras = [];
      let extraRowsToFinalize = [];
      if (isTextLikeInbound) {
        collectedExtras = await collectBurstExtraRows(row, classified);

        const burstTexts = [String(textBody)];
        for (const extraRow of collectedExtras) {
          const extraClassified = classifyWhatsAppEvent(extraRow);
          const loaded = await loadTextForClassifiedEvent(extraRow, extraClassified);
          if (!loaded.ok || loaded.empty) continue;
          burstTexts.push(String(loaded.textBody));
          extraRowsToFinalize.push(extraRow);
        }

        if (burstTexts.length > 1) {
          textBody = combineBurstMessagesForSummary(burstTexts);
        }

        const extraIdsLast4 = extraRowsToFinalize.map((x) => tailN(x?.id, 4)).join(",");
        console.log(
          `[batch] primary_id_last4=${tailN(id, 4)} extra_count=${extraRowsToFinalize.length} total_chars=${String(textBody || "").length}${extraIdsLast4 ? ` extra_ids_last4=${extraIdsLast4}` : ""}`
        );
      }

      const r = await processWhatsAppText(waNumber, user, textBody, eventTsIso);

      if (r.action === "summary_sent" && extraRowsToFinalize.length > 0) {
        await markBatchedChildrenProcessed(extraRowsToFinalize, id);
      }

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
        last_error: truncateErr500(e),
      });
      console.log("[worker] non-fatal loop error:", String(e?.message || e).slice(0, 200));
    } finally {
      await wipeInboundEventTextEnc(id);
    }
  }

  console.log("[worker] loop stopped");
}

mainLoop().catch((e) => {
  console.error("[worker] fatal:", truncateErr500(e));
  process.exit(1);
});
