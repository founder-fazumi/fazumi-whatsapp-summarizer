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
 * Turn on by setting: DEBUG_WEBHOOKS=1
 * This prints payload shape to logs (does NOT store raw payload in DB).
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
 * Extract WhatsApp meta safely.
 *
 * We try your existing extractWhatsAppMeta(body) first.
 * If it looks empty, we fallback to Meta/Cloud style payload:
 *   body.entry[0].changes[0].value.messages[0]
 * and also handle:
 *   body.entry[0].changes[0].value.statuses[0]
 *
 * IMPORTANT:
 * - "Test Webhook" events in 360dialog often do NOT include messages[0].
 *   We will treat those as non-actionable and skip inserting them.
 */
function extractWhatsAppMetaSafe(body) {
  // 1) Try your util extractor first
  let meta = null;
  try {
    meta = extractWhatsAppMeta(body);
  } catch {
    meta = null;
  }

  const utilLooksGood =
    meta &&
    (meta.msg_type || meta.text_body || meta.from_phone || meta.wa_message_id || meta.timestamp);

  if (utilLooksGood) return meta;

  // 2) Fallback to Meta/Cloud style payload
  const entry = Array.isArray(body?.entry) ? body.entry[0] : null;
  const change = Array.isArray(entry?.changes) ? entry.changes[0] : null;

  const field = change?.field ?? null;
  const value = change?.value ?? null;

  // --- messages ---
  const msg = Array.isArray(value?.messages) ? value.messages[0] : null;
  if (msg) {
    const msg_type = msg?.type ?? null;
    const from_phone = msg?.from ?? null;
    const wa_message_id = msg?.id ?? null;
    const timestamp = msg?.timestamp ?? null;

    let text_body = msg?.text?.body ?? null;

    // Some other inbound types
    if (!text_body && msg_type === "button") {
      text_body = msg?.button?.text ?? null;
    }
    if (!text_body && msg_type === "interactive") {
      text_body =
        msg?.interactive?.button_reply?.title ??
        msg?.interactive?.list_reply?.title ??
        null;
    }

    return {
      field: field || "messages",
      wa_id: value?.metadata?.phone_number_id || value?.metadata?.display_phone_number || null,
      object: body?.object || "whatsapp_business_account",
      msg_type: msg_type || null,
      text_body: text_body ? String(text_body).slice(0, 4096) : null,
      timestamp: timestamp || null,
      from_phone: from_phone || null,
      wa_message_id: wa_message_id || null,
    };
  }

  // --- statuses (delivery/read/etc) ---
  const st = Array.isArray(value?.statuses) ? value.statuses[0] : null;
  if (st) {
    // statuses don’t include text; we store minimal info so it’s not “empty”
    return {
      field: field || "statuses",
      wa_id: value?.metadata?.phone_number_id || value?.metadata?.display_phone_number || null,
      object: body?.object || "whatsapp_business_account",
      msg_type: "status",
      text_body: null,
      timestamp: st?.timestamp ?? null,
      from_phone: st?.recipient_id ?? null, // best available “who it relates to”
      wa_message_id: st?.id ?? null,
      status: st?.status ?? null,
    };
  }

  // Nothing usable found
  return {
    field: field || null,
    wa_id: null,
    object: body?.object || null,
    msg_type: null,
    text_body: null,
    timestamp: null,
    from_phone: null,
    wa_message_id: null,
  };
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

    // Parse JSON for minimal meta
    let parsed = null;
    try {
      parsed = JSON.parse(req.body.toString("utf8"));
    } catch {
      parsed = null;
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

// Normal JSON parser AFTER Lemon raw route
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, name: process.env.APP_NAME || "fazumi-whatsapp-summarizer" });
});

/**
 * WhatsApp webhook:
 * - ACK 200 immediately
 * - Store minimal meta only
 * - SKIP inserts for payloads that contain neither messages nor statuses
 */
app.post("/webhooks/whatsapp", (req, res) => {
  // ACK immediately
  res.sendStatus(200);

  debugWebhookSample("whatsapp", req.body);

  const body = req.body || {};
  const meta = extractWhatsAppMetaSafe(body);

  // ✅ IMPORTANT: If we got no message id, no sender, and no type, this is not actionable.
  // This prevents the 360dialog Test Webhook spam from filling your DB with null rows.
  const hasAnythingUseful =
    Boolean(meta?.wa_message_id) ||
    Boolean(meta?.from_phone) ||
    Boolean(meta?.msg_type) ||
    Boolean(meta?.field);

  const isRealInboundMessage = meta?.msg_type === "text" && Boolean(meta?.from_phone);

  // If it's neither a real inbound message nor a status notification, skip storing
  if (!isRealInboundMessage && meta?.msg_type !== "status") {
    // You can still see it in logs if DEBUG_WEBHOOKS=1
    return;
  }

  const eventId = meta?.wa_message_id || uuidv4();
  const payloadHash = sha256Hex(JSON.stringify(body));

  const waNumberTopLevel = meta?.from_phone || null;

  const row = {
    provider: "whatsapp",
    provider_event_id: eventId,
    event_type: meta?.field || "unknown",
    payload_sha256: payloadHash,
    wa_number: waNumberTopLevel,
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
