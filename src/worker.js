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
 * - Worker decrypts meta.text_enc, uses it, then wipes it (best-effort)
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
const CHAT_EXPORTS_BUCKET = envTrim("CHAT_EXPORTS_BUCKET") || "chat_exports";

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
 * - Shows only prefix + length (no secrets)
 * - This is the fastest way to confirm Cloud Run secrets are injected correctly.
 */
console.log("[env-check]", {
  hasUrl: !!SUPABASE_URL,
  hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
  serviceKeyLen: SUPABASE_SERVICE_ROLE_KEY ? SUPABASE_SERVICE_ROLE_KEY.length : null,
  serviceKeyPrefix: SUPABASE_SERVICE_ROLE_KEY ? SUPABASE_SERVICE_ROLE_KEY.slice(0, 6) : null,
  hasD360: !!D360_API_KEY,
  d360KeyLen: D360_API_KEY ? D360_API_KEY.length : null,
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

function buildLemonCheckoutUrl(waNumber) {
  if (!LEMON_CHECKOUT_URL) throw new Error("Missing LEMON_CHECKOUT_URL");
  const u = new URL(LEMON_CHECKOUT_URL);
  u.searchParams.set("checkout[custom][wa_number]", String(waNumber));
  return u.toString();
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
  const mime = String(doc?.mime_type || "").toLowerCase();
  const filename = String(doc?.filename || "").toLowerCase();
  return ZIP_ACCEPT_MIME_TYPES.has(mime) || filename.endsWith(".zip");
}

function safeStorageUserPart(userId) {
  const raw = userId == null ? "unknown" : String(userId);
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  return safe || "unknown";
}

async function get360MediaDownloadUrl(mediaId) {
  const endpoint = `${D360_BASE_URL.replace(/\/$/, "")}/${encodeURIComponent(String(mediaId || ""))}`;
  const resp = await fetch(endpoint, {
    method: "GET",
    headers: { "D360-API-KEY": D360_API_KEY },
  });

  if (!resp.ok) {
    throw new Error(`media_url_lookup_${resp.status}`);
  }

  const payload = await resp.json().catch(() => null);
  const url = payload?.url || payload?.data?.url || null;
  if (!url) throw new Error("media_url_missing");
  return String(url);
}

async function downloadZipBytes(downloadUrl) {
  let resp = await fetch(downloadUrl);
  if (resp.status === 401 || resp.status === 403) {
    resp = await fetch(downloadUrl, {
      headers: { "D360-API-KEY": D360_API_KEY },
    });
  }
  if (!resp.ok) throw new Error(`media_download_${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

async function pickBestTxtFromZip(zipBytes) {
  const zip = await JSZip.loadAsync(zipBytes);
  const txtFiles = Object.values(zip.files).filter((f) => !f.dir && /\.txt$/i.test(f.name));
  if (!txtFiles.length) return null;

  let best = null;
  for (const f of txtFiles) {
    const buf = Buffer.from(await f.async("uint8array"));
    if (!best || buf.length > best.buf.length) {
      best = { name: f.name, buf };
    }
  }
  return best;
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

  // Non-document media is intentionally refused in MVP.
  if (!doc && media) {
    await sendWhatsAppText(
      waNumber,
      "I can’t process media files right now. Please send a WhatsApp Export Chat ZIP (Without media)."
    );
    return { action: "media_refused", skip_reason: "non_document_media" };
  }

  if (!doc) {
    await sendWhatsAppText(
      waNumber,
      "I can only process WhatsApp Export Chat ZIP files (Without media). Please send a .zip file."
    );
    return { action: "media_refused", skip_reason: "missing_document_meta" };
  }

  const mimeType = String(doc?.mime_type || "").toLowerCase();
  const mediaId = String(doc?.media_id || "").trim();
  const shaHex = normalizeDocShaToHex(doc?.sha256);
  const sha8 = shaHex.slice(0, 8) || "unknown";
  const msgId = row?.msg_id || "unknown";
  let sizeBytes = 0;

  try {
    if (!isAcceptedZipDocument(doc)) {
      await sendWhatsAppText(
        waNumber,
        "I can only process WhatsApp Export Chat ZIP files (Export chat -> Without media). Please resend as .zip."
      );
      return { action: "media_refused", skip_reason: "unsupported_document_type" };
    }

    if (DRY_RUN) {
      await sendWhatsAppText(waNumber, "ZIP detected (dry run)");
      return { action: "zip_detected_dry_run", skip_reason: null };
    }

    if (!mediaId) {
      await sendWhatsAppText(
        waNumber,
        "I couldn’t read that ZIP reference. Please export chat again as ZIP (Without media) and resend."
      );
      return { action: "media_skipped", skip_reason: "missing_media_id" };
    }

    const downloadUrl = await get360MediaDownloadUrl(mediaId);
    const zipBytes = await downloadZipBytes(downloadUrl);
    sizeBytes = zipBytes.length;

    if (zipBytes.length < 2 || zipBytes[0] !== 0x50 || zipBytes[1] !== 0x4b) {
      await sendWhatsAppText(
        waNumber,
        "That file does not look like a valid ZIP. Please send a WhatsApp Export Chat ZIP (Without media)."
      );
      return { action: "media_skipped", skip_reason: "zip_magic_mismatch" };
    }

    const picked = await pickBestTxtFromZip(zipBytes);
    if (!picked || !picked.buf || picked.buf.length < 1) {
      await sendWhatsAppText(
        waNumber,
        "I couldn’t find a chat .txt in that ZIP. Please export using WhatsApp 'Without media' and resend."
      );
      return { action: "media_skipped", skip_reason: "zip_no_txt" };
    }

    const userPart = safeStorageUserPart(row?.user_id);
    const storagePath = `${userPart}/${row?.id}/${shaHex}.txt`;

    const { error: uploadErr } = await supabase.storage.from(CHAT_EXPORTS_BUCKET).upload(storagePath, picked.buf, {
      upsert: true,
      contentType: "text/plain; charset=utf-8",
    });
    if (uploadErr) throw new Error(`storage_upload_${String(uploadErr.message || uploadErr).slice(0, 120)}`);

    await upsertChatExportBestEffort(row, storagePath, shaHex, picked.buf.length);

    await sendWhatsAppText(
      waNumber,
      "ZIP received. I extracted the chat text and saved it. Now you can ask: 'What did X say about Y?'"
    );

    return {
      action: "zip_txt_stored",
      skip_reason: null,
      metaPatch: { zip_txt_path: storagePath },
    };
  } finally {
    console.log(
      `[zip] id=${row?.id} msg_id=${msgId} mime=${mimeType || "unknown"} size=${sizeBytes} sha256_8=${sha8}`
    );
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
    await sendWhatsAppText(waNumber, "⚠️ Sorry—summarizer is temporarily busy. Try again.");
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
        await markEvent(id, {
          status: "processed",
          outcome: r.action || "media_processed",
          skip_reason: r.skip_reason || null,
          meta: r.metaPatch ? { ...(meta || {}), ...r.metaPatch } : meta || null,
        });
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
