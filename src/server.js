require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const { v4: uuidv4 } = require("uuid");

const { getSupabaseAdmin, safeInsertInboundEvent } = require("./supabase");
const { redact, verifyLemonSignature, extractWhatsAppMeta, sha256Hex } = require("./util");

const app = express();
const supabase = getSupabaseAdmin();

app.use(helmet());
app.use(morgan("tiny"));

/**
 * Lemon webhook:
 * - MUST use RAW body for signature verification (X-Signature + HMAC SHA-256)
 * - ACK fast
 * Docs: Signing Requests. :contentReference[oaicite:8]{index=8}
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

    // Parse JSON for minimal meta
    let parsed = null;
    try {
      parsed = JSON.parse(req.body.toString("utf8"));
    } catch {
      parsed = null;
    }

    // Event name per Lemon docs: meta.event_name :contentReference[oaicite:9]{index=9}
    const eventName = parsed?.meta?.event_name || "unknown";

    // Custom data may appear here per Lemon docs (checkout[custom] passes through) :contentReference[oaicite:10]{index=10}
    const waNumber =
      parsed?.meta?.custom_data?.wa_number ||
      parsed?.meta?.custom_data?.waNumber ||
      parsed?.meta?.custom_data?.phone ||
      parsed?.meta?.custom?.wa_number ||
      parsed?.meta?.custom?.waNumber ||
      null;

    // Subscription id: usually data.id for subscription_* events
    const dataId = parsed?.data?.id || null;
    const subscriptionId = dataId;

    // Some extra minimal fields if present
    const attrs = parsed?.data?.attributes || {};
    const customerId = attrs?.customer_id || attrs?.customerId || null;
    const status = attrs?.status || null;
    const renewsAt = attrs?.renews_at || attrs?.renewsAt || null;

    const eventId =
      eventName && dataId ? `${eventName}:${dataId}` : uuidv4();

    const payloadHash = sha256Hex(req.body);

    const row = {
      provider: "lemonsqueezy",
      provider_event_id: eventId,
      event_type: eventName,
      payload_sha256: payloadHash,
      meta: {
        event_name: eventName,
        wa_number: waNumber,
        subscription_id: subscriptionId,
        customer_id: customerId,
        status: status,
        renews_at: renewsAt,
        test_mode: parsed?.meta?.test_mode ?? null,
      },
    };

    setImmediate(async () => {
      await safeInsertInboundEvent(supabase, row);
    });
  }
);

// Normal JSON parser after Lemon raw route
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, name: process.env.APP_NAME || "fazumi-whatsapp-summarizer" });
});

/**
 * WhatsApp webhook:
 * - Must ACK 200 quickly or provider retries
 * - We store minimal meta (including msg_type/text_body for worker), not full raw payload
 */
app.post("/webhooks/whatsapp", (req, res) => {
  res.sendStatus(200);

  const body = req.body || {};
  const meta = extractWhatsAppMeta(body);
  const eventId = meta.wa_message_id || uuidv4();
  const payloadHash = sha256Hex(JSON.stringify(body));

  const row = {
    provider: "whatsapp",
    provider_event_id: eventId,
    event_type: meta.field || "unknown",
    payload_sha256: payloadHash,
    meta,
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
