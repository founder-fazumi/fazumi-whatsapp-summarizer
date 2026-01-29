"use strict";

const crypto = require("crypto");

/** Redact secrets in logs */
function redact(v) {
  const s = String(v || "");
  if (s.length <= 8) return "****";
  return `${s.slice(0, 4)}****${s.slice(-4)}`;
}

function sha256Hex(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input || ""), "utf8");
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
 * 360dialog documents messages/statuses events. We support both. :contentReference[oaicite:5]{index=5}
 *
 * Returns stable keys:
 * - field, object
 * - msg_type, text_body
 * - from_phone, wa_message_id, timestamp
 */
function extractWhatsAppMetaSafe(body) {
  const entry = Array.isArray(body?.entry) ? body.entry[0] : null;
  const change = Array.isArray(entry?.changes) ? entry.changes[0] : null;

  const field = change?.field ?? null;
  const value = change?.value ?? null;

  // messages[0]
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

    // cap length, do not store huge payload
    const cappedText = text_body ? String(text_body).slice(0, 4096) : null;

    return {
      field: field || "messages",
      object: body?.object || "whatsapp_business_account",
      msg_type: msg_type || null,
      text_body: cappedText,
      timestamp: timestamp || null,
      from_phone: from_phone || null,
      wa_message_id: wa_message_id || null,
      wa_id: value?.metadata?.phone_number_id || value?.metadata?.display_phone_number || null,
    };
  }

  // statuses[0] (delivery/read receipts, etc)
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
      wa_id: value?.metadata?.phone_number_id || value?.metadata?.display_phone_number || null,
    };
  }

  // Non-actionable/test payload
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
