"use strict";

/**
 * Fazumi Webhook Server (Legal+Safety Hardened)
 *
 * Responsibilities:
 * 1) ACK webhooks FAST (<= 5 seconds) then enqueue work to Supabase.
 * 2) Never do heavy processing inside the webhook handler.
 * 3) Never log secrets or full user message bodies.
 *
 * Legal + Safety:
 * - Default: DO NOT store raw user message text in DB.
 * - Store only:
 *   - text_sha256 (proof/dedupe)
 *   - text_enc (AES-GCM encrypted payload) + text_len
 *   - minimal meta fields (no raw text)
 *
 * Phase 5 additions:
 * - Bind to 0.0.0.0 + PORT for cloud hosting (Render/Cloud Run).
 * - Handle multi-message payloads deterministically.
 * - Ignore non-text message types for MVP text-only launch.
 *
 * IMPORTANT:
 * - Paywall decision MUST happen BEFORE any OpenAI call (worker enforces).
 * - Dedupe inbound using provider_event_id (wa message id) at DB level.
 * - Increment free usage ONLY after WhatsApp reply send success (worker enforces).
 */

require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

const { getSupabaseAdmin, normalizeProvider, safeInsertInboundEvent } = require("./supabase");
const { redact, verifyLemonSignature, sha256Hex } = require("./util");

const app = express();
app.set("trust proxy", 1);

const supabase = getSupabaseAdmin();

/**
 * VERSION MARKER
 * Bump this string whenever you deploy changes so logs prove what's running.
 */
const SERVER_BUILD_TAG = "SG7-webhook-scheduled-queue-2026-02-14";

app.use(helmet());
app.use(morgan("tiny"));

/**
 * Optional debug logging (OFF by default).
 * Turn on by setting: DEBUG_WEBHOOKS=1
 * SAFETY: never print full message bodies.
 */
function debugWebhookSample(label, body) {
  if (process.env.DEBUG_WEBHOOKS !== "1") return;
  try {
    const b = body || {};
    console.log(`[debug] ${label} build=${SERVER_BUILD_TAG}`);
    console.log(`[debug] ${label} top-level keys:`, Object.keys(b || {}).slice(0, 40));
    console.log(`[debug] ${label} entry_count:`, Array.isArray(b.entry) ? b.entry.length : null);
  } catch (e) {
    console.log(`[debug] ${label} failed`, String(e?.message || e).slice(0, 200));
  }
}

/**
 * Parse boolean env flags explicitly with a safe default.
 */
function readEnvFlag(name, defaultValue) {
  const raw = process.env[name];
  if (raw == null) return defaultValue;

  const normalized = String(raw).trim().toLowerCase();
  if (!normalized) return defaultValue;

  if (["1", "true", "yes", "on", "healthy", "enabled"].includes(normalized)) return true;
  if (["0", "false", "no", "off", "unhealthy", "disabled"].includes(normalized)) return false;

  return defaultValue;
}

function parseIntEnv(rawValue, fallback, minValue = 0) {
  if (rawValue == null) return fallback;
  const n = Number(rawValue);
  if (!Number.isFinite(n)) return fallback;
  const v = Math.floor(n);
  if (v < minValue) return fallback;
  return v;
}

function resolveBurstWindowSeconds(rawValue) {
  return parseIntEnv(rawValue, 20, 1);
}

const WORKER_POOL_HEALTHY = readEnvFlag("WORKER_POOL_HEALTHY", true);
const BURST_WINDOW_SECONDS = resolveBurstWindowSeconds(process.env.BURST_WINDOW_SECONDS);
const EFFECTIVE_BURST_WINDOW_MS = BURST_WINDOW_SECONDS * 1000;
// Manual verify: send a WhatsApp webhook and confirm inserted inbound_events rows have provider='whatsapp', status='queued', and non-null next_attempt_at ~= now()+BURST_WINDOW_SECONDS.

/**
 * Parse timestamp robustly.
 * Supports epoch seconds, epoch millis, or ISO strings.
 * Returns ISO string or null.
 */
function parseTimestampToIsoOrNull(ts) {
  try {
    if (ts == null) return null;

    if (ts instanceof Date) {
      return isNaN(ts.getTime()) ? null : ts.toISOString();
    }

    const raw = String(ts).trim();
    if (!raw) return null;

    const asNumber = Number(raw);
    if (Number.isFinite(asNumber)) {
      const ms = asNumber < 1e12 ? asNumber * 1000 : asNumber;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }

    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

function normalizeInboundCommandText(text) {
  const collapsed = String(text || "").trim().replace(/\s+/g, " ");
  const normalized = collapsed.toUpperCase().replace(/^\/+/, "").replace(/[.!?]+$/g, "");
  return normalized.trim();
}

function normalizeRawCommandText(text) {
  return String(text || "").trim().replace(/\s+/g, " ").replace(/^\/+/, "").trim();
}

function extractInboundTextBody(msg) {
  const type = String(msg?.type || "").toLowerCase();
  if (type === "text") return String(msg?.text?.body || "");
  if (type === "button") return String(msg?.button?.text || "");
  if (type === "interactive") {
    const title = msg?.interactive?.button_reply?.title || msg?.interactive?.list_reply?.title || "";
    return String(title);
  }
  return "";
}

/**
 * AES-256-GCM encryption for message text.
 * Env required:
 *   FAZUMI_TEXT_ENC_KEY_B64 = base64(32 bytes)
 */
function getEncKey() {
  const b64 = process.env.FAZUMI_TEXT_ENC_KEY_B64;
  if (!b64) return null;
  try {
    const key = Buffer.from(b64, "base64");
    if (key.length !== 32) return null;
    return key;
  } catch {
    return null;
  }
}

function encryptTextOrNull(plaintext) {
  try {
    const key = getEncKey();
    if (!key) return null;

    const iv = crypto.randomBytes(12); // GCM standard
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const pt = Buffer.from(String(plaintext || ""), "utf8");
    const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      v: 1,
      iv_b64: iv.toString("base64"),
      tag_b64: tag.toString("base64"),
      ct_b64: ct.toString("base64"),
    };
  } catch {
    return null;
  }
}

/**
 * Extract WhatsApp Cloud API "value" envelope safely.
 */
function extractWhatsAppValueEnvelope(body) {
  try {
    if (!body || typeof body !== "object") return null;

    if (Array.isArray(body.messages)) return body; // normalized payloads

    const entry0 = Array.isArray(body.entry) ? body.entry[0] : null;
    if (!entry0 || typeof entry0 !== "object") return null;

    const change0 = Array.isArray(entry0.changes) ? entry0.changes[0] : null;
    if (!change0 || typeof change0 !== "object") return null;

    const value = change0.value || null;
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function safeIdSuffixForPath(id) {
  const raw = String(id || "");
  const suffix = raw.slice(-8) || "unknown";
  return suffix.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function normalizePhoneE164(rawPhone) {
  const raw = String(rawPhone || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return `+${digits}`;
}

const HAS_TEXT_ENC_KEY = Boolean(getEncKey());
if (!HAS_TEXT_ENC_KEY) {
  console.error("[server] Missing or invalid FAZUMI_TEXT_ENC_KEY_B64 (must be base64 of 32 bytes).");
  process.exit(1);
}

/**
 * Minimal sender + metadata extraction (no text).
 */
function getCommonWaMeta(value) {
  const metadata = value?.metadata || {};
  const contacts0 = Array.isArray(value?.contacts) ? value.contacts[0] : null;
  const waId = normalizePhoneE164(contacts0?.wa_id || null);

  return {
    phone_number_id: metadata?.phone_number_id || null,
    display_phone_number: metadata?.display_phone_number || null,
    from_phone: waId || null,
  };
}

/**
 * Extract reaction meta (emoji + reacted message id).
 * 360dialog docs show reaction webhooks exist. (Handled by worker for prefs update.)
 */
function extractReactionMeta(msg) {
  try {
    if (!msg || typeof msg !== "object") return null;

    const msgType = String(msg.type || "").toLowerCase();
    if (msgType !== "reaction") return null;

    const r = msg.reaction;
    if (!r || typeof r !== "object") return null;

    return {
      emoji: r.emoji || null,
      reacted_to_message_id: r.message_id || null,
    };
  } catch {
    return null;
  }
}

/**
 * Extract other media types safely (image/audio/video/sticker).
 * We do NOT download or process these in MVP.
 */
function extractOtherMediaMeta(msg) {
  try {
    if (!msg || typeof msg !== "object") return null;

    const msgType = String(msg.type || "").toLowerCase();
    if (!msgType) return null;

    const ignored = new Set(["text", "interactive", "button", "status", "reaction"]);
    if (ignored.has(msgType)) return null;

    const carrier = msg[msgType];
    if (!carrier || typeof carrier !== "object") return null;

    return {
      media_type: msgType,
      media_id: carrier.id || null,
      mime_type: carrier.mime_type || null,
      sha256: carrier.sha256 || null,
    };
  } catch {
    return null;
  }
}

/**
 * Decide if a WhatsApp event should be queued for the worker.
 * We only suppress summary work when the worker pool is unhealthy.
 */
function shouldEnqueueInboundEvent(eventKind, workerPoolHealthy) {
  if (workerPoolHealthy) return true;
  return eventKind !== "inbound_text";
}

/**
 * Only persist raw inbound text when we will enqueue summary work.
 */
function shouldPersistInboundText({ eventKind, hasText, shouldEnqueue }) {
  if (!hasText) return false;
  if (eventKind !== "inbound_text") return false;
  return Boolean(shouldEnqueue);
}

const BURST_PENDING_STATUSES = ["pending", "queued"];

function resolveBurstPhone(insertedRow, phoneE164) {
  return normalizePhoneE164(phoneE164 || insertedRow?.from_phone || insertedRow?.wa_number || "");
}

function computeBurstDeadlineIso(windowSeconds) {
  const safeSeconds = parseIntEnv(windowSeconds, 20, 1);
  return new Date(Date.now() + safeSeconds * 1000).toISOString();
}

async function bumpPendingBurstDeadlinesForPhone({
  supabaseClient,
  phoneE164,
  insertedRow,
  newDeadlineIso,
}) {
  const phone = resolveBurstPhone(insertedRow, phoneE164);
  if (!phone) {
    return { ok: false, skipped: true, reason: "missing_phone" };
  }

  const safeDeadlineIso = parseTimestampToIsoOrNull(newDeadlineIso);
  if (!safeDeadlineIso) {
    return { ok: false, skipped: true, reason: "invalid_deadline" };
  }

  const deadlineOrFilter = [
    `and(from_phone.eq.${phone},next_attempt_at.is.null)`,
    `and(from_phone.eq.${phone},next_attempt_at.lt.${safeDeadlineIso})`,
    `and(wa_number.eq.${phone},next_attempt_at.is.null)`,
    `and(wa_number.eq.${phone},next_attempt_at.lt.${safeDeadlineIso})`,
  ].join(",");

  const { error } = await supabaseClient
    .from("inbound_events")
    .update({ next_attempt_at: safeDeadlineIso })
    .or(deadlineOrFilter)
    .in("status", BURST_PENDING_STATUSES)
    .is("processed_at", null);

  if (error) {
    return { ok: false, skipped: false, reason: String(error.message || error).slice(0, 140) };
  }

  return { ok: true, skipped: false, phone, deadline: safeDeadlineIso };
}

/**
 * Lemon webhook:
 * - MUST use RAW body for signature verification
 * - ACK fast
 */
app.post("/webhooks/lemonsqueezy", express.raw({ type: "application/json", limit: "1mb" }), (req, res) => {
  const sig = req.get("X-Signature");
  const signingSecret = process.env.LEMON_SIGNING_SECRET;

  const verdict = verifyLemonSignature({
    rawBody: req.body,
    signatureHeader: sig,
    signingSecret,
  });

  if (!verdict.ok) {
    console.log("[lemonsqueezy] invalid signature:", verdict.reason, "sig:", redact(sig));
    return res.status(401).json({ ok: false, error: "invalid_signature" });
  }

  // ACK immediately
  res.status(200).json({ ok: true });

  // Parse JSON after ACK
  let parsed = null;
  try {
    parsed = JSON.parse(req.body.toString("utf8"));
  } catch {
    parsed = null;
  }

  const eventName = parsed?.meta?.event_name || "unknown";
  const dataId = parsed?.data?.id || null;

  const waNumber =
    parsed?.meta?.custom_data?.wa_number ||
    parsed?.meta?.custom_data?.waNumber ||
    parsed?.meta?.custom_data?.phone ||
    parsed?.meta?.custom?.wa_number ||
    parsed?.meta?.custom?.waNumber ||
    null;

  const providerEventId = eventName && dataId ? `${eventName}:${dataId}` : uuidv4();
  const payloadHash = sha256Hex(req.body);

  const attrs = parsed?.data?.attributes || {};
  const status = attrs?.status || null;
  const renewsAt = attrs?.renews_at || attrs?.renewsAt || null;
  const customerId = attrs?.customer_id || attrs?.customerId || null;

  const row = {
    provider: normalizeProvider("lemonsqueezy", "whatsapp"),
    status: "pending",
    attempts: 0,
    next_attempt_at: new Date().toISOString(),
    provider_event_id: providerEventId,
    payload_sha256: payloadHash,
    wa_number: waNumber,
    meta: {
      event_name: eventName,
      wa_number: waNumber,
      data_id: dataId,
      customer_id: customerId,
      status,
      renews_at: renewsAt,
      test_mode: parsed?.meta?.test_mode ?? null,
    },
  };

  setImmediate(async () => {
    try {
      await safeInsertInboundEvent(supabase, row);
    } catch (e) {
      console.log("[lemonsqueezy] enqueue failed:", String(e?.message || e).slice(0, 300));
    }
  });
});

// Normal JSON parser AFTER Lemon raw route
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    name: process.env.APP_NAME || "fazumi-whatsapp-summarizer",
    build: SERVER_BUILD_TAG,
  });
});

app.get("/debug/ping", (req, res) => {
  res.status(200).json({ ok: true, build: SERVER_BUILD_TAG });
});

/**
 * WhatsApp webhook (360dialog):
 * - ACK 200 immediately
 * - Enqueue work (async) to inbound_events (worker does processing)
 *
 * Notes:
 * - 360dialog recommends responding immediately and processing async. (We comply.)
 */
app.post("/webhooks/whatsapp", (req, res) => {
  // ACK immediately (do not await anything)
  res.sendStatus(200);

  const receivedAtIso = new Date().toISOString();
  const body = req.body || {};

  console.log(`[whatsapp] webhook hit build=${SERVER_BUILD_TAG} at=${receivedAtIso}`);
  debugWebhookSample("whatsapp", body);

  // Do all processing async so webhook stays fast.
  setImmediate(async () => {
    try {
      const value = extractWhatsAppValueEnvelope(body);
      if (!value) return;

      const common = getCommonWaMeta(value);
      const workerPoolHealthy = WORKER_POOL_HEALTHY;

      // Status updates can come in value.statuses
      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const st of statuses) {
        const statusMsgId = st?.id || null;
        const statusName = st?.status ? String(st.status).toLowerCase() : "status";
        const statusPhone = normalizePhoneE164(st?.recipient_id || common.from_phone || null);
        if (!statusMsgId || !statusPhone) continue;

        const providerEventId = `${statusMsgId}:${statusName}`;
        const payloadHash = sha256Hex(Buffer.from(JSON.stringify({ kind: "status", st })));

        const row = {
          provider: "whatsapp",
          status: "queued",
          attempts: 0,
          provider_event_id: providerEventId,
          payload_sha256: payloadHash,
          wa_number: statusPhone,
          from_phone: statusPhone,
          wa_message_id: statusMsgId,
          next_attempt_at: new Date(Date.now() + EFFECTIVE_BURST_WINDOW_MS).toISOString(),
          user_msg_ts: parseTimestampToIsoOrNull(st?.timestamp) || receivedAtIso,
          meta: {
            ...common,
            msg_type: "status",
            event_kind: "status_event",
            status: statusName,
            skip_reason: "status_event",
          },
        };

        const inserted = await safeInsertInboundEvent(supabase, row);
        if (!inserted?.ok) {
          console.log(`[whatsapp] status_enqueue_failed msg_id=${safeIdSuffixForPath(statusMsgId)}`);
        }
      }

      // Incoming messages can come in value.messages[]
      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const msg of messages) {
        const msgId = msg?.id || null;
        const from = normalizePhoneE164(msg?.from || common.from_phone || null);
        const msgType = String(msg?.type || "").toLowerCase().trim();
        const msgTsIso = parseTimestampToIsoOrNull(msg?.timestamp) || receivedAtIso;

        if (!msgId || !from || !msgType) continue;

        // Text extraction (only for hashing/storage; never stored raw in DB)
        const rawText = extractInboundTextBody(msg);
        // Note: interactive payloads vary; worker can handle details if needed.

        const upper = rawText ? normalizeInboundCommandText(rawText) : "";
        const rawCommand = rawText ? normalizeRawCommandText(rawText) : "";

        const COMMANDS = new Set(["HELP", "STATUS", "PAY", "STOP", "START", "DELETE", "FEEDBACK"]);
        const isLangCommand = /^LANG(?:\s+(?:AUTO|EN|AR|ES))$/.test(upper);
        const isFeedbackCommand = /^FEEDBACK$/i.test(rawCommand);

        const isTextLike = msgType === "text" || msgType === "interactive" || msgType === "button";
        const hasText = rawText && rawText.trim().length > 0;
        const isCommand = isTextLike && hasText && (COMMANDS.has(upper) || isLangCommand || isFeedbackCommand);

        const reactionMeta = extractReactionMeta(msg);
        const otherMediaMeta = extractOtherMediaMeta(msg);

        const isReaction = Boolean(reactionMeta);
        const isOtherMedia = Boolean(otherMediaMeta);

        // Decide event_kind for worker routing
        const event_kind = isCommand
          ? "inbound_command"
          : isTextLike && hasText
          ? "inbound_text"
          : isOtherMedia
          ? "inbound_unsupported_media"
          : "unknown";

        // Ignore unknowns to avoid noise
        if (event_kind === "unknown" || isReaction) continue;

        const shouldEnqueue = shouldEnqueueInboundEvent(event_kind, workerPoolHealthy);
        const skipReason = shouldEnqueue ? null : "worker_pool_unhealthy";

        const payloadHash = sha256Hex(Buffer.from(JSON.stringify({ kind: "message", msg_type: msgType, id: msgId })));

        const textSha = hasText ? sha256Hex(Buffer.from(rawText, "utf8")) : null;
        const textLen = hasText ? rawText.length : null;
        let textEnc = null;

        const shouldPersistText = shouldPersistInboundText({
          eventKind: event_kind,
          hasText,
          shouldEnqueue,
        });

        if (shouldPersistText) {
          const encrypted = encryptTextOrNull(rawText);
          if (encrypted) textEnc = encrypted;
        }

        const safeMeta = {
          ...common,
          from_phone: from,
          msg_type: msgType,
          event_kind,

          ...(event_kind === "inbound_command" ? { command: isFeedbackCommand ? rawCommand : upper } : {}),
          ...(textSha ? { text_sha256: textSha } : {}),
          ...(textEnc ? { text_enc: textEnc, text_len: textLen } : {}),
          ...(otherMediaMeta ? { media: otherMediaMeta } : {}),
          ...(reactionMeta ? { reaction: reactionMeta } : {}),
          ...(skipReason ? { skip_reason: skipReason } : {}),
        };

        const row = {
          provider: "whatsapp",
          status: "queued",
          attempts: 0,
          provider_event_id: msgId, // dedupe key (DB must enforce)
          payload_sha256: payloadHash,
          wa_number: from,
          from_phone: from,
          wa_message_id: msgId,
          user_msg_ts: msgTsIso,
          next_attempt_at: new Date(Date.now() + EFFECTIVE_BURST_WINDOW_MS).toISOString(),
          meta: safeMeta,
        };



        if (!shouldEnqueue) {
          console.log(
            `[whatsapp] enqueue_skipped reason=${skipReason} msg_id=${safeIdSuffixForPath(msgId)} msg_type=${msgType}`
          );
        }

        const inserted = await safeInsertInboundEvent(supabase, row);
        if (!inserted?.ok) {
          console.log(`[whatsapp] enqueue_failed msg_id=${safeIdSuffixForPath(msgId)}`);
          continue;
        }
        if (inserted?.deduped || inserted?.inserted === false) {
          console.log(`[whatsapp] deduped msg_id=${safeIdSuffixForPath(msgId)}`);
          continue;
        }

        if (event_kind === "inbound_text" && shouldEnqueue && inserted?.row) {
          const burstDeadline = computeBurstDeadlineIso(BURST_WINDOW_SECONDS);
          const burst = await bumpPendingBurstDeadlinesForPhone({
            supabaseClient: supabase,
            phoneE164: from,
            insertedRow: inserted.row,
            newDeadlineIso: burstDeadline,
          });
          if (burst?.ok && burst?.deadline) {
            console.log(
              `[burst] schedule phone=${safeIdSuffixForPath(from)} deadline=${burst.deadline} statuses=${BURST_PENDING_STATUSES.join(",")}`
            );
          } else if (!burst?.skipped) {
            console.log(
              `[burst] schedule_failed phone=${safeIdSuffixForPath(from)} reason=${String(burst?.reason || "unknown").slice(0, 120)}`
            );
          }
        }
      }
    } catch (e) {
      console.log("[whatsapp] async enqueue failed:", String(e?.message || e).slice(0, 300));
    }
  });
});

// Cloud-friendly: bind to 0.0.0.0 and PORT
const port = Number(process.env.PORT || 3000);
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`[server] build=${SERVER_BUILD_TAG}`);
  console.log(`[server] listening on http://${host}:${port}`);
  console.log(`[server] supabase configured: ${Boolean(supabase)}`);
  console.log(`[server] worker_pool_healthy=${WORKER_POOL_HEALTHY}`);
});
