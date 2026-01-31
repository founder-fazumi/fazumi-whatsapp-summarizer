"use strict";

/**
 * Fazumi Webhook Server (Phase 5)
 *
 * Responsibilities:
 * 1) ACK webhooks FAST (<= 5 seconds) then enqueue work to Supabase.
 * 2) Never do heavy processing inside the webhook handler.
 * 3) Never log secrets or full user message bodies.
 *
 * Phase 5 additions:
 * - Enqueue WhatsApp DOCUMENT messages (ZIP uploads) into inbound_events,
 *   so the worker can later download + parse the ZIP (R3/R4).
 */

require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const { v4: uuidv4 } = require("uuid");

const { getSupabaseAdmin, safeInsertInboundEvent } = require("./supabase");
const { redact, verifyLemonSignature, extractWhatsAppMetaSafe, sha256Hex } = require("./util");

const app = express();
const supabase = getSupabaseAdmin();

/**
 * VERSION MARKER
 * Bump this string whenever you deploy changes so logs prove what's running.
 */
const SERVER_BUILD_TAG = "SG4-2-server-enqueue-document-zip-2026-01-31";

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
 * OPTIONAL PROOF LOG (OFF by default):
 * Prints ONLY meta keys + a few scalar flags. Never prints text_body.
 * Enable with: DEBUG_META_KEYS=1
 */
function debugMetaKeys(label, row) {
  if (process.env.DEBUG_META_KEYS !== "1") return;
  try {
    const keys = Object.keys(row?.meta || {}).sort();
    console.log(
      `[debug] ${label} meta_keys=${JSON.stringify(keys)}` +
        ` event_kind=${row?.meta?.event_kind || null}` +
        ` skip_reason=${row?.meta?.skip_reason || null}` +
        ` msg_type=${row?.meta?.msg_type || null}` +
        ` provider_event_id=${row?.provider_event_id || null}`
    );
  } catch (e) {
    console.log(`[debug] ${label} meta_keys failed`, String(e?.message || e).slice(0, 200));
  }
}

/**
 * Parse timestamp robustly.
 * Supports epoch seconds, epoch millis, or ISO strings.
 * Returns ISO string or null.
 */
function parseToIsoOrNull(ts) {
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
}

/**
 * Extract DOCUMENT info (ZIP upload) from the raw webhook payload safely.
 *
 * We DO NOT log or store binary.
 * We only keep the minimal document metadata:
 * - media_id (document.id)
 * - filename
 * - mime_type
 * - sha256 (if provided by provider)
 * - caption (optional)
 */
function extractDocumentMetaSafe(body) {
  try {
    const entry0 = Array.isArray(body?.entry) ? body.entry[0] : null;
    const change0 = Array.isArray(entry0?.changes) ? entry0.changes[0] : null;
    const value = change0?.value || null;

    // WhatsApp Cloud API shape: value.messages[0]
    const msg0 = Array.isArray(value?.messages) ? value.messages[0] : null;
    if (!msg0) return null;

    if (String(msg0.type || "").toLowerCase() !== "document") return null;

    const doc = msg0.document || null;
    if (!doc) return null;

    return {
      // Standard fields seen in Cloud API payloads
      media_id: doc.id || null,
      mime_type: doc.mime_type || null,
      filename: doc.filename || null,
      sha256: doc.sha256 || null,
      caption: doc.caption || msg0.caption || null,
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
app.post(
  "/webhooks/lemonsqueezy",
  express.raw({ type: "application/json", limit: "1mb" }),
  (req, res) => {
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
  }
);

// Normal JSON parser AFTER Lemon raw route
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    name: process.env.APP_NAME || "fazumi-whatsapp-summarizer",
    build: SERVER_BUILD_TAG,
  });
});

// Quick reachability check
app.get("/debug/ping", (req, res) => {
  res.status(200).json({ ok: true, build: SERVER_BUILD_TAG });
});

/**
 * WhatsApp webhook (360dialog):
 * - ACK 200 immediately (<= 5s requirement)
 * - Insert ONLY into inbound_events table (worker does processing)
 *
 * IMPORTANT:
 * - We must distinguish inbound user messages vs status receipts
 * - AND we must enqueue DOCUMENT messages (ZIP) for Phase 5 R3/R4.
 */
app.post("/webhooks/whatsapp", (req, res) => {
  // ACK immediately (never block here)
  res.sendStatus(200);

  // Proof log: route hit
  console.log(`[whatsapp] webhook hit build=${SERVER_BUILD_TAG} at=${new Date().toISOString()}`);

  debugWebhookSample("whatsapp", req.body);

  const body = req.body || {};

  // Existing safe meta extraction (text/status)
  const meta = extractWhatsAppMetaSafe(body);

  // Additional safe doc extraction (document/zip)
  const docMeta = extractDocumentMetaSafe(body);

  const msgType = String(meta.msg_type || (docMeta ? "document" : "") || "").toLowerCase();

  const hasSender = Boolean(meta.from_phone); // for docs, your extractWhatsAppMetaSafe MUST still provide from_phone
  const hasMsgId = Boolean(meta.wa_message_id);
  const hasTextBody = Boolean(meta.text_body && String(meta.text_body).trim().length > 0);

  const isTextLikeType = msgType === "text" || msgType === "interactive" || msgType === "button";
  const isStatusType = msgType === "status" || Boolean(meta.status);
  const isDocumentType = msgType === "document" || Boolean(docMeta);

  // What we accept into the queue:
  const isActionableTextInbound = isTextLikeType && hasSender && hasMsgId && hasTextBody;
  const isStatusEvent = isStatusType && hasSender && hasMsgId;
  const isDocumentInbound = isDocumentType && hasSender && hasMsgId; // doc doesn't need text_body

  // If it's none of the above, ignore it
  if (!isActionableTextInbound && !isStatusEvent && !isDocumentInbound) return;

  // Hash the full payload (safe, no secrets) for debugging / dedupe analysis
  const payloadHash = sha256Hex(Buffer.from(JSON.stringify(body)));

  // Stable provider_event_id:
  // - Status events: add a suffix so sent/delivered/read are distinct
  // - Text/doc messages: use wa_message_id if present
  const statusSuffix = meta.status ? String(meta.status).toLowerCase() : "status";
  const providerEventId = isStatusEvent
    ? `${meta.wa_message_id}:${statusSuffix}`
    : meta.wa_message_id || uuidv4();

  const userMsgIso = parseToIsoOrNull(meta.timestamp);

  const row = {
    provider: "whatsapp",
    status: isActionableTextInbound || isDocumentInbound ? "pending" : "done",
    attempts: 0,

    provider_event_id: providerEventId,
    payload_sha256: payloadHash,

    wa_number: meta.from_phone || null,
    from_phone: meta.from_phone || null,
    wa_message_id: meta.wa_message_id || null,
    user_msg_ts: userMsgIso,

    // IMPORTANT: store only minimal safe metadata
    meta: {
      ...meta,

      // Attach document fields if present
      ...(docMeta ? { document: docMeta } : {}),

      // Classify for worker
      event_kind: isActionableTextInbound
        ? "inbound_message"
        : isDocumentInbound
        ? "inbound_document"
        : "status_event",

      ...(isStatusEvent ? { skip_reason: "status_event" } : {}),
    },
  };

  // Enqueue asynchronously after ACK
  setImmediate(async () => {
    try {
      debugMetaKeys("whatsapp_insert", row);
      await safeInsertInboundEvent(supabase, row);
    } catch (e) {
      console.log("[whatsapp] enqueue failed:", String(e?.message || e).slice(0, 300));
    }
  });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`[server] build=${SERVER_BUILD_TAG}`);
  console.log(`[server] listening on http://localhost:${port}`);
  console.log(`[server] supabase configured: ${Boolean(supabase)}`);
});
