"use strict";

const crypto = require("crypto");

/**
 * Redact secrets in logs
 */
function redact(v) {
  const s = String(v || "");
  if (s.length <= 8) return "****";
  return `${s.slice(0, 4)}****${s.slice(-4)}`;
}

function sha256Hex(input) {
  const buf = Buffer.isBuffer(input)
    ? input
    : Buffer.from(String(input || ""), "utf8");
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/**
 * Lemon Squeezy signing (official docs):
 * - Use raw body
 * - Compare HMAC SHA-256 with X-Signature header
 */
function verifyLemonSignature({ rawBody, signatureHeader, signingSecret }) {
  if (!signingSecret) return { ok: false, reason: "missing_signing_secret" };
  if (!signatureHeader) return { ok: false, reason: "missing_signature_header" };
  if (!rawBody) return { ok: false, reason: "missing_raw_body" };

  try {
    const hmac = crypto.createHmac("sha256", signingSecret);
    hmac.update(rawBody);
    const expected = hmac.digest("hex");

    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(String(signatureHeader), "utf8");
    if (a.length !== b.length) return { ok: false, reason: "length_mismatch" };

    const ok = crypto.timingSafeEqual(a, b);
    return ok ? { ok: true } : { ok: false, reason: "mismatch" };
  } catch (e) {
    return { ok: false, reason: "exception", error: e?.message || String(e) };
  }
}

/**
 * Robust extraction for 360dialog / Meta-style payload.
 *
 * IMPORTANT DESIGN RULE:
 * - This function returns ONLY sanitized, minimal WhatsApp fields
 * - It MUST NOT erase system-level keys added later (event_kind, skip_reason)
 *
 * We solve this by:
 * - returning a plain object
 * - never freezing / sealing / deep-normalizing it
 * - and clearly separating "extracted payload" from "system metadata"
 *
 * Supported events:
 * - messages (text / interactive / button)
 * - statuses (sent / delivered / read receipts)
 *
 * Docs:
 * https://docs.360dialog.com/partner/messaging-and-calling/sending-and-receiving-messages/receiving-messages-via-webhook
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/
 */
function extractWhatsAppMetaSafe(body) {
  const entry = Array.isArray(body?.entry) ? body.entry[0] : null;
  const change = Array.isArray(entry?.changes) ? entry.changes[0] : null;

  const field = change?.field ?? null;
  const value = change?.value ?? null;

  // -------- inbound user messages --------
  const msg = Array.isArray(value?.messages) ? value.messages[0] : null;
  if (msg) {
    const msg_type = msg?.type ?? null;
    const from_phone = msg?.from ?? null;
    const wa_message_id = msg?.id ?? null;
    const timestamp = msg?.timestamp ?? null;

    let text_body = msg?.text?.body ?? null;

    // button reply
    if (!text_body && msg_type === "button") {
      text_body = msg?.button?.text ?? null;
    }

    // interactive reply
    if (!text_body && msg_type === "interactive") {
      text_body =
        msg?.interactive?.button_reply?.title ??
        msg?.interactive?.list_reply?.title ??
        null;
    }

    // Cap length to avoid storing large user payloads
    const cappedText = text_body
      ? String(text_body).slice(0, 4096)
      : null;

    return {
      field: field || "messages",
      object: body?.object || "whatsapp_business_account",

      msg_type: msg_type || null,
      text_body: cappedText,

      timestamp: timestamp || null,
      from_phone: from_phone || null,
      wa_message_id: wa_message_id || null,

      wa_id:
        value?.metadata?.phone_number_id ||
        value?.metadata?.display_phone_number ||
        null,
    };
  }

  // -------- status / receipt events --------
  const st = Array.isArray(value?.statuses) ? value.statuses[0] : null;
  if (st) {
    return {
      field: field || "statuses",
      object: body?.object || "whatsapp_business_account",

      msg_type: "status",
      text_body: null,

      timestamp: st?.timestamp ?? null,
      from_phone: st?.recipient_id ?? null,
      wa_message_id: st?.id ?? null,

      status: st?.status ?? null,

      wa_id:
        value?.metadata?.phone_number_id ||
        value?.metadata?.display_phone_number ||
        null,
    };
  }

  // -------- non-actionable / test payload --------
  return {
    field: field || null,
    object: body?.object || null,

    msg_type: null,
    text_body: null,

    timestamp: null,
    from_phone: null,
    wa_message_id: null,
    wa_id: null,
  };
}

module.exports = {
  redact,
  sha256Hex,
  verifyLemonSignature,
  extractWhatsAppMetaSafe,
};
