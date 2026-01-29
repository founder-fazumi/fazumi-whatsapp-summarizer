// src/util.js
const crypto = require("crypto");

/**
 * Redact secrets in logs (very basic).
 */
function redact(value) {
  if (!value) return null;
  const s = String(value);
  if (s.length <= 6) return "***";
  return `${s.slice(0, 3)}***${s.slice(-3)}`;
}

/**
 * sha256 helper
 * - If input is Buffer -> hash raw bytes
 * - If input is string -> hash utf8 string
 */
function sha256Hex(input) {
  const h = crypto.createHash("sha256");
  if (Buffer.isBuffer(input)) h.update(input);
  else h.update(String(input), "utf8");
  return h.digest("hex");
}

/**
 * Verify Lemon Squeezy webhook signature (HMAC-SHA256 hex over payload).
 * Lemon docs: X-Signature + signing secret. :contentReference[oaicite:5]{index=5}
 */
function verifyLemonSignature({ rawBody, signatureHeader, signingSecret }) {
  if (!signingSecret) return { ok: false, reason: "missing_signing_secret" };
  if (!signatureHeader) return { ok: false, reason: "missing_signature_header" };
  if (!rawBody) return { ok: false, reason: "missing_raw_body" };

  try {
    const hmac = crypto.createHmac("sha256", signingSecret);
    hmac.update(rawBody);
    const expected = hmac.digest("hex");

    // timing-safe compare
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(String(signatureHeader), "utf8");

    if (a.length !== b.length) return { ok: false, reason: "length_mismatch" };
    const match = crypto.timingSafeEqual(a, b);

    return match ? { ok: true } : { ok: false, reason: "mismatch" };
  } catch (err) {
    return { ok: false, reason: err?.message || "exception" };
  }
}

/**
 * Extract ONLY the minimum WhatsApp message fields needed for async processing.
 *
 * Expected message payload location (360dialog / WhatsApp):
 * body.entry[0].changes[0].value.messages[0]
 * docs: receiving messages webhook. :contentReference[oaicite:6]{index=6}
 *
 * We intentionally do NOT store the full raw payload.
 * We store text_body only for type="text" and truncate to limit retention.
 */
function extractWhatsAppMeta(body) {
  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  const field = change?.field || null;
  const wa_id = value?.metadata?.phone_number_id || null;

  const msg = value?.messages?.[0] || null;

  const wa_message_id = msg?.id || null;
  const from_phone = msg?.from || null;
  const msg_type = msg?.type || null;

  let text_body = null;
  if (msg_type === "text") {
    text_body = (msg?.text?.body || "").trim();
    if (text_body.length > 4000) text_body = text_body.slice(0, 4000);
  }

  const timestamp = msg?.timestamp || null;

  return {
    field,
    wa_id,
    wa_message_id,
    from_phone,
    msg_type,
    text_body,
    timestamp,
    object: body?.object || null,
  };
}

module.exports = {
  redact,
  sha256Hex,
  verifyLemonSignature,
  extractWhatsAppMeta,
};
