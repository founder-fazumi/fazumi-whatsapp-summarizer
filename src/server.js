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
 * Optional debug logging (OFF by default).
 * Enable with: DEBUG_WEBHOOKS=1
 */
function debugWebhookSample(label, body) {
  if (process.env.DEBUG_WEBHOOKS !== "1") return;
  try {
    console.log(`[debug] ${label} keys:`, Object.keys(body || {}));
    console.log(
      `[debug] ${label} sample:\n`,
      JSON.stringify(body || {}, null, 2).slice(0, 2000)
    );
  } catch {}
}

/**
 * Safe WhatsApp meta extraction
 * - Tries util.extractWhatsAppMeta first
 * - Falls back to Meta Cloud API payload shape
 */
function extractWhatsAppMetaSafe(body) {
  // 1) Try existing extractor
  try {
    const meta = extractWhatsAppMeta(body);
    if (
      meta &&
      (meta.msg_type || meta.text_body || meta.from_phone || meta.wa_message_id)
    ) {
      return meta;
    }
  } catch {}

  // 2) Meta Cloud fallback
  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const msg = value?.messages?.[0];

  if (!msg) return {};

  return {
    field: change?.field ?? null,
    object: "whatsapp_business_account",
    msg_type: msg?.type ?? null,
    text_body: msg?.text?.body ?? null,
    from_phone: msg?.from ?? null,
    wa_message_id: msg?.id ?? null,
    timestamp: msg?.timestamp ?? null,
  };
}

/**
 * Lemon Squeezy webhook
 * MUST use raw body for signature verification
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
      console.log("[lemonsqueezy] invalid signature:", verdict.reason);
      return res.status(401).json({ ok: false });
    }

    res.status(200).json({ ok: true });

    let parsed;
    try {
      parsed = JSON.parse(req.body.toString("utf8"));
    } catch {
      return;
    }

    const eventName = parsed?.meta?.event_name || "unknown";
    const subscriptionId = parsed?.data?.id || null;

    const waNumber =
      parsed?.meta?.custom_data?.wa_number ||
      parsed?.meta?.custom?.wa_number ||
      null;

    const payloadHash = sha256Hex(req.body);

    const row = {
      provider: "lemonsqueezy",
      provider_event_id: subscriptionId
        ? `${eventName}:${subscriptionId}`
        : uuidv4(),
      event_type: eventName,
      payload_sha256: payloadHash,
      meta: {
        event_name: eventName,
        subscription_id: subscriptionId,
        wa_number: waNumber,
        status: parsed?.data?.attributes?.status ?? null,
        renews_at: parsed?.data?.attributes?.renews_at ?? null,
      },
    };

    setImmediate(() => safeInsertInboundEvent(supabase, row));
  }
);

// Normal JSON parser AFTER Lemon raw route
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

/**
 * WhatsApp webhook (360dialog / Meta)
 */
app.post("/webhooks/whatsapp", (req, res) => {
  // ACK immediately
  res.sendStatus(200);

  debugWebhookSample("whatsapp", req.body);

  const meta = extractWhatsAppMetaSafe(req.body);
  const payloadHash = sha256Hex(JSON.stringify(req.body));

  const row = {
    provider: "whatsapp",
    provider_event_id: meta?.wa_message_id || uuidv4(),
    event_type: meta?.field || "messages",
    payload_sha256: payloadHash,
    wa_number: meta?.from_phone || null, // convenience copy
    meta, // ✅ all details live here
  };

  setImmediate(() => safeInsertInboundEvent(supabase, row));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`[server] listening on port ${port}`);
  console.log(`[server] supabase configured: ${Boolean(supabase)}`);
});
