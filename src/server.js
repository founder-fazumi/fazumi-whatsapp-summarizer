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
 *   - text_ref (Supabase Storage pointer) + text_len
 *   - minimal meta fields (no raw text)
 *
 * Phase 5 additions:
 * - Bind to 0.0.0.0 + PORT for cloud hosting (Render/Cloud Run).
 * - Handle multi-message payloads deterministically.
 * - Handle Reaction messages (for perceived learning in worker).
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

const { getSupabaseAdmin, safeInsertInboundEvent } = require("./supabase");
const { redact, verifyLemonSignature, sha256Hex } = require("./util");

const app = express();
app.set("trust proxy", 1);

const supabase = getSupabaseAdmin();
const CHAT_EXPORTS_BUCKET = process.env.CHAT_EXPORTS_BUCKET || "chat-exports";

/**
 * VERSION MARKER
 * Bump this string whenever you deploy changes so logs prove what's running.
 */
const SERVER_BUILD_TAG = "SG5-legal-safety-router-enc-text-reaction-multi-2026-02-02";

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
 * Parse timestamp robustly.
 * Supports epoch seconds, epoch millis, or ISO strings.
 * Returns ISO string or null.
 */
function parseToIsoOrNull(ts) {
  try {
    if (ts == null) return null;

    if (ts instanceof Date && !isNaN(ts.getTime())) return ts.toISOString();

    const s = String(ts).trim();
    if (!s) return null;

    const n = Number(s);
    if (!Number.isNaN(n)) {
      const ms = n < 1e12 ? n * 1000 : n; // seconds vs millis
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }

    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
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
function getWaValue(body) {
  try {
    const entry0 = Array.isArray(body?.entry) ? body.entry[0] : null;
    const change0 = Array.isArray(entry0?.changes) ? entry0.changes[0] : null;
    const value = change0?.value || null;
    if (value) return value;
    if (Array.isArray(body?.messages)) return body; // normalized payloads
    return null;
  } catch {
    return null;
  }
}

function safeLast8ForPath(id) {
  const raw = String(id || "");
  const last8 = raw.slice(-8) || "unknown";
  return last8.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function inboundTextPathFromMsgId(msgId) {
  return `inbound_text/${safeLast8ForPath(msgId)}.txt`;
}

/**
 * Minimal sender + metadata extraction (no text).
 */
function getCommonWaMeta(value) {
  const metadata = value?.metadata || {};
  const contacts0 = Array.isArray(value?.contacts) ? value.contacts[0] : null;
  const waId = contacts0?.wa_id || null;

  return {
    phone_number_id: metadata?.phone_number_id || null,
    display_phone_number: metadata?.display_phone_number || null,
    from_phone: waId || null,
  };
}

/**
 * Extract DOCUMENT info safely.
 * NOTE: Worker will still refuse processing except WhatsApp Export ZIP (.txt without media).
 * We do NOT download binary in server.
 */
function extractDocumentMetaSafe(msg) {
  try {
    if (!msg || String(msg.type || "").toLowerCase() !== "document") return null;
    const doc = msg.document || null;
    if (!doc) return null;

    return {
      media_id: doc.id || null,
      mime_type: doc.mime_type || null,
      filename: doc.filename || null,
      sha256: doc.sha256 || null,
      caption: doc.caption || msg.caption || null,
    };
  } catch {
    return null;
  }
}

/**
 * Extract reaction meta (emoji + reacted message id).
 * 360dialog docs show reaction webhooks exist. (Handled by worker for prefs update.)
 */
function extractReactionMetaSafe(msg) {
  try {
    if (!msg || String(msg.type || "").toLowerCase() !== "reaction") return null;
    const r = msg.reaction || null;
    if (!r) return null;
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
function extractOtherMediaMetaSafe(msg) {
  try {
    if (!msg) return null;
    const t = String(msg.type || "").toLowerCase();
    if (!t) return null;

    // Allowed handled separately:
    if (t === "text" || t === "interactive" || t === "button" || t === "status" || t === "document" || t === "reaction") {
      return null;
    }

    const carrier = msg[t] || null;
    return {
      media_type: t,
      media_id: carrier?.id || null,
      mime_type: carrier?.mime_type || null,
      sha256: carrier?.sha256 || null,
      caption: carrier?.caption || msg.caption || null,
    };
  } catch {
    return null;
  }
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
    provider: "lemonsqueezy",
    status: "pending",
    attempts: 0,
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
      const value = getWaValue(body);
      if (!value) return;

      const common = getCommonWaMeta(value);

      // Status updates can come in value.statuses
      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const st of statuses) {
        const statusMsgId = st?.id || null;
        const statusName = st?.status ? String(st.status).toLowerCase() : "status";
        if (!statusMsgId || !common.from_phone) continue;

        const providerEventId = `${statusMsgId}:${statusName}`;
        const payloadHash = sha256Hex(Buffer.from(JSON.stringify({ kind: "status", st })));

        const row = {
          provider: "whatsapp",
          status: "done",
          attempts: 0,
          provider_event_id: providerEventId,
          payload_sha256: payloadHash,
          wa_number: common.from_phone,
          from_phone: common.from_phone,
          wa_message_id: statusMsgId,
          user_msg_ts: parseToIsoOrNull(st?.timestamp) || receivedAtIso,
          meta: {
            ...common,
            msg_type: "status",
            event_kind: "status_event",
            status: statusName,
            skip_reason: "status_event",
          },
        };

        await safeInsertInboundEvent(supabase, row);
      }

      // Incoming messages can come in value.messages[]
      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const msg of messages) {
        const msgId = msg?.id || null;
        const from = msg?.from || common.from_phone || null;
        const msgType = String(msg?.type || "").toLowerCase().trim();
        const msgTsIso = parseToIsoOrNull(msg?.timestamp) || receivedAtIso;

        if (!msgId || !from || !msgType) continue;

        // Text extraction (only for hashing/storage; never stored raw in DB)
        let rawText = "";
        if (msgType === "text" && msg?.text?.body) rawText = String(msg.text.body);
        if ((msgType === "interactive" || msgType === "button") && msg?.button?.text) rawText = String(msg.button.text);
        // Note: interactive payloads vary; worker can handle details if needed.

        const upper = rawText ? rawText.trim().toUpperCase() : "";

        const COMMANDS = new Set([
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

        const isTextLike = msgType === "text" || msgType === "interactive" || msgType === "button";
        const hasText = rawText && rawText.trim().length > 0;
        const isCommand = isTextLike && hasText && COMMANDS.has(upper);

        const docMeta = extractDocumentMetaSafe(msg);
        const reactionMeta = extractReactionMetaSafe(msg);
        const otherMediaMeta = extractOtherMediaMetaSafe(msg);

        const isDocument = Boolean(docMeta);
        const isReaction = Boolean(reactionMeta);
        const isOtherMedia = Boolean(otherMediaMeta);

        // Decide event_kind for worker routing
        const event_kind = isReaction
          ? "inbound_reaction"
          : isDocument || isOtherMedia
          ? "inbound_media"
          : isCommand
          ? "inbound_command"
          : isTextLike && hasText
          ? "inbound_text"
          : "unknown";

        // Ignore unknowns to avoid noise
        if (event_kind === "unknown") continue;

        const payloadHash = sha256Hex(Buffer.from(JSON.stringify({ kind: "message", msg_type: msgType, id: msgId })));

        const textSha = hasText ? sha256Hex(Buffer.from(rawText, "utf8")) : null;
        const textLen = hasText ? rawText.length : null;
        let textRef = null;

        if (event_kind === "inbound_text" && hasText) {
          const storagePath = inboundTextPathFromMsgId(msgId);
          textRef = { bucket: CHAT_EXPORTS_BUCKET, path: storagePath };
          try {
            const textBuf = Buffer.from(rawText, "utf8");
            const { error: uploadErr } = await supabase.storage.from(CHAT_EXPORTS_BUCKET).upload(storagePath, textBuf, {
              upsert: true,
              contentType: "text/plain; charset=utf-8",
            });
            if (uploadErr) {
              console.log(
                `[whatsapp] text_store outcome=error msg_id=${safeLast8ForPath(msgId)} msg_type=${msgType} text_len=${textLen} has_text_ref=true`
              );
            }
          } catch {
            console.log(
              `[whatsapp] text_store outcome=error msg_id=${safeLast8ForPath(msgId)} msg_type=${msgType} text_len=${textLen} has_text_ref=true`
            );
          }
        }

        const safeMeta = {
          ...common,
          from_phone: from,
          msg_type: msgType,
          event_kind,

          ...(event_kind === "inbound_command" ? { command: upper } : {}),
          ...(textSha ? { text_sha256: textSha } : {}),
          ...(textRef ? { text_ref: textRef, text_len: textLen } : {}),

          ...(docMeta ? { document: docMeta } : {}),
          ...(otherMediaMeta ? { media: otherMediaMeta } : {}),
          ...(reactionMeta ? { reaction: reactionMeta } : {}),
        };

        const row = {
          provider: "whatsapp",
          status: event_kind === "status_event" ? "done" : "pending",
          attempts: 0,
          provider_event_id: msgId, // dedupe key (DB must enforce)
          payload_sha256: payloadHash,
          wa_number: from,
          from_phone: from,
          wa_message_id: msgId,
          user_msg_ts: msgTsIso,
          meta: safeMeta,
        };

        await safeInsertInboundEvent(supabase, row);
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
  console.log(`[server] inbound_text_bucket=${CHAT_EXPORTS_BUCKET}`);
});
