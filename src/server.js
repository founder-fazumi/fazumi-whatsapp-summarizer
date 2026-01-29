require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const { v4: uuidv4 } = require("uuid");

const { getSupabaseAdmin, safeInsertInboundEvent } = require("./supabase");
const { redact, verifyLemonSignature, sha256Hex } = require("./util");

const app = express();
const supabase = getSupabaseAdmin();

app.use(helmet());
app.use(morgan("tiny"));

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
 * Extract minimal message fields from Meta/360dialog webhook payload.
 * 360dialog webhooks can include:
 * - messages (inbound user messages)
 * - statuses (delivery/read updates)  :contentReference[oaicite:2]{index=2}
 *
 * We ONLY want to queue inbound text messages for the worker.
 */
function extractWhatsAppMetaSafe(body) {
  const entry = Array.isArray(body?.entry) ? body.entry[0] : null;
  const change = Array.isArray(entry?.changes) ? entry.changes[0] : null;
  const field = change?.field ?? null;
  const value = change?.value ?? null;

  const msg = Array.isArray(value?.messages) ? value.messages[0] : null;

  if (!msg) {
    return {
      field,
      msg_type: null,
      text_body: null,
      from_phone: null,
      wa_message_id: null,
      timestamp: null,
    };
  }

  const msg_type = msg?.type ?? null;
  const from_phone = msg?.from ?? null;
  const wa_message_id = msg?.id ?? null;
  const timestamp = msg?.timestamp ?? null;

  let text_body = null;
  if (msg_type === "text") {
    text_body = msg?.text?.body ?? null;
  } else if (msg_type === "button") {
    text_body = msg?.button?.text ?? null;
  } else if (msg_type === "interactive") {
    text_body =
      msg?.interactive?.button_reply?.title ??
      msg?.interactive?.list_reply?.title ??
      null;
  }

  return {
    field,
    msg_type,
    text_body: text_body ? String(text_body).slice(0, 4096) : null,
    from_phone,
    wa_message_id,
    timestamp,
  };
}

/**
 * Lemon webhook: RAW body required for signature verification
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

    res.status(200).json({ ok: true });

    let parsed = null;
    try {
      parsed = JSON.parse(req.body.toString("utf8"));
    } catch {
      return;
    }

    const eventName = parsed?.meta?.event_name || "unknown";

    const waNumber =
      parsed?.meta?.custom_data?.wa_number ||
      parsed?.meta?.custom_data?.waNumber ||
      parsed?.meta?.custom_data?.phone ||
      parsed?.meta?.custom?.wa_number ||
      parsed?.meta?.custom?.waNumber ||
      null;

    const dataId = parsed?.data?.id || null;
    const subscriptionId = dataId;

    const attrs = parsed?.data?.attributes || {};
    const customerId = attrs?.customer_id || attrs?.customerId || null;
    const status = attrs?.status || null;
    const renewsAt = attrs?.renews_at || attrs?.renewsAt || null;

    const eventId = eventName && dataId ? `${eventName}:${dataId}` : uuidv4();
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

// JSON parser AFTER Lemon route
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, name: process.env.APP_NAME || "fazumi-whatsapp-summarizer" });
});

/**
 * WhatsApp webhook:
 * - ACK fast
 * - Ignore statuses/noise; only insert real inbound TEXT messages :contentReference[oaicite:3]{index=3}
 */
app.post("/webhooks/whatsapp", (req, res) => {
  res.sendStatus(200);

  debugWebhookSample("whatsapp", req.body);

  const body = req.body || {};
  const meta = extractWhatsAppMetaSafe(body);

  // ✅ HARD FILTER: only queue inbound text messages
  if (!meta?.from_phone || meta?.msg_type !== "text" || !meta?.text_body) {
    if (process.env.DEBUG_WEBHOOKS === "1") {
      console.log("[whatsapp] ignored non-text/status event:", {
        field: meta?.field,
        msg_type: meta?.msg_type,
        has_from: Boolean(meta?.from_phone),
        has_text: Boolean(meta?.text_body),
      });
    }
    return;
  }

  const eventId = meta.wa_message_id || uuidv4();
  const payloadHash = sha256Hex(JSON.stringify(body));

  const row = {
    provider: "whatsapp",
    provider_event_id: eventId,
    event_type: meta.field || "messages",
    payload_sha256: payloadHash,
    wa_number: meta.from_phone,
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
