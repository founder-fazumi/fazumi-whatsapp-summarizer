"use strict";

require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const { v4: uuidv4 } = require("uuid");

const { getSupabaseAdmin, safeInsertInboundEvent } = require("./supabase");
const { redact, verifyLemonSignature, extractWhatsAppMetaSafe, sha256Hex } = require("./util");

const app = express();
const supabase = getSupabaseAdmin();

app.use(helmet());
app.use(morgan("tiny"));

/**
 * Optional debug logging (OFF by default).
 * Turn on by setting: DEBUG_WEBHOOKS=1
 * WARNING: This prints inbound payload samples to logs; don't enable in production unless needed.
 */
function debugWebhookSample(label, body) {
  if (process.env.DEBUG_WEBHOOKS !== "1") return;
  try {
    const keys = Object.keys(body || {});
    console.log(`[debug] ${label} keys:`, keys);
    const sample = JSON.stringify(body || {}, null, 2).slice(0, 2000);
    console.log(`[debug] ${label} sample (first 2000 chars):\n${sample}`);
  } catch (e) {
    console.log(`[debug] ${label} failed to stringify`, e?.message || e);
  }
}

/**
 * Lemon webhook:
 * - MUST use RAW body for signature verification (Lemon docs)
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

    // Idempotency: prefer stable event id when possible
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
      await safeInsertInboundEvent(supabase, row);
    });
  }
);

// Normal JSON parser AFTER Lemon raw route
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, name: process.env.APP_NAME || "fazumi-whatsapp-summarizer" });
});

/**
 * WhatsApp webhook (360dialog):
 * - ACK 200 immediately
 * - Insert ONLY into inbound_events table (never view)
 * - Store minimal meta (no secrets; cap text length)
 * - Ignore empty/test payloads
 */
app.post("/webhooks/whatsapp", (req, res) => {
  // ACK immediately (timing expectation)
  res.sendStatus(200);

  debugWebhookSample("whatsapp", req.body);

  const body = req.body || {};
  const meta = extractWhatsAppMetaSafe(body);

  // We only enqueue actionable inbound messages for the worker.
  // Status receipts can be stored but should NOT be queued for summarization.
  const isInboundMessage =
    (meta.field === "messages" || meta.msg_type === "text" || meta.msg_type === "interactive" || meta.msg_type === "button") &&
    Boolean(meta.from_phone) &&
    Boolean(meta.wa_message_id);

  const isStatus = meta.field === "statuses" || meta.msg_type === "status";

  // If neither a real inbound message nor a status update, skip (prevents DB spam from test webhooks)
  if (!isInboundMessage && !isStatus) return;

  const payloadHash = sha256Hex(JSON.stringify(body));
  const providerEventId = meta.wa_message_id || uuidv4();

  // IMPORTANT:
  // - inbound user messages => status=pending (worker should process)
  // - statuses => status=done (worker should ignore)
  const row = {
    provider: "whatsapp",
    status: isInboundMessage ? "pending" : "done",
    attempts: 0,
    provider_event_id: providerEventId,
    payload_sha256: payloadHash,

    // normalized columns (if your table has them; if not, safeInsert will still insert core fields)
    wa_number: meta.from_phone || null,
    from_phone: meta.from_phone || null,
    wa_message_id: meta.wa_message_id || null,
    user_msg_ts: meta.timestamp ? new Date(Number(meta.timestamp) * 1000).toISOString() : null,

    meta, // includes text_body capped to 4096
  };

  setImmediate(async () => {
    await safeInsertInboundEvent(supabase, row);
  });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
  console.log(`[server] supabase configured: ${Boolean(supabase)}`);
});
