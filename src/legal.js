'use strict';

/**
 * Fazumi - Legal/Safety gate (MVP)
 *
 * HARD RULES:
 * - Do NOT log raw user message bodies.
 * - Do NOT log secrets.
 * - Return a small decision object used by worker.js.
 *
 * This module is intentionally minimal to:
 * 1) Stop worker pool crash (MODULE_NOT_FOUND)
 * 2) Preserve the existing legal layer behavior described in the thread
 *
 * You may need to adjust field names to match your DB schema,
 * but we keep it conservative and "fail safe".
 */

/**
 * @typedef {Object} LegalDecision
 * @property {boolean} stop - if true, worker must stop further processing
 * @property {string} outcome - outcome string for audit
 * @property {string=} reply_text - optional text to send back to the user
 */

function normalizeText(s) {
  return String(s || '').trim();
}

function isCommand(text, cmd) {
  return normalizeText(text).toUpperCase() === cmd;
}

/**
 * Determine if we should send first-time privacy notice and/or set ToS acceptance.
 *
 * Expected inputs (best-effort; safe defaults):
 * - waNumber: your WhatsApp business number (string)
 * - user: object from DB with:
 *   - privacy_notice_sent_at (nullable)
 *   - tos_accepted_at (nullable)
 *   - is_opted_out / is_blocked (optional)
 *   - tos_version (optional)
 *
 * @param {string} waNumber
 * @param {Object|null} user
 * @param {Object=} opts
 * @param {string=} opts.inbound_text - plaintext inbound text (already decrypted upstream)
 * @returns {Promise<LegalDecision>}
 */
async function ensureFirstTimeNoticeAndTos(waNumber, user, opts = {}) {
  const inboundText = normalizeText(opts.inbound_text);

  // Hard block conditions (if your schema has these flags)
  if (user && (user.is_blocked === true || user.is_opted_out === true)) {
    return { stop: true, outcome: 'user_blocked_or_opted_out' };
  }

  // Handle high-priority commands first (MVP-safe)
  // NOTE: actual command side-effects (DB updates/deletion) should happen in worker.js
  if (isCommand(inboundText, 'STOP')) return { stop: true, outcome: 'cmd_stop' };
  if (isCommand(inboundText, 'START')) return { stop: false, outcome: 'cmd_start' };
  if (isCommand(inboundText, 'DELETE')) return { stop: true, outcome: 'cmd_delete' };
  if (isCommand(inboundText, 'HELP')) return { stop: true, outcome: 'cmd_help' };
  if (isCommand(inboundText, 'STATUS')) return { stop: true, outcome: 'cmd_status' };
  if (isCommand(inboundText, 'PAY')) return { stop: true, outcome: 'cmd_pay' };
  if (isCommand(inboundText, 'IMPROVE ON')) return { stop: true, outcome: 'cmd_improve_on' };
  if (isCommand(inboundText, 'IMPROVE OFF')) return { stop: true, outcome: 'cmd_improve_off' };

  // First-time notice gate (per spec: first inbound message sends notice; do not summarize)
  const privacySent = !!(user && user.privacy_notice_sent_at);
  if (!privacySent) {
    // Do NOT include long walls of text here; keep it one WhatsApp message (from your spec).
    // Links are placeholders until pages exist.
    const reply =
      "👋 Welcome to Fazumi.\n" +
      "By messaging here, you allow Fazumi to process your messages to generate summaries.\n" +
      "Please don’t send sensitive/confidential info.\n" +
      "Supported: text + WhatsApp “Export chat → Without media” ZIP (.txt inside).\n" +
      "Reply HELP for commands. STOP to opt out. DELETE to erase stored data.\n" +
      "Terms: <terms_link_placeholder>\n" +
      "Privacy: <privacy_link_placeholder>";

    return { stop: true, outcome: 'privacy_notice_sent', reply_text: reply };
  }

  // ToS acceptance is implied by continued use; worker.js should set tos_accepted_at on next message.
  // We do not stop processing here; we just provide outcome for audit if needed.
  const tosAccepted = !!(user && user.tos_accepted_at);
  if (!tosAccepted) {
    return { stop: false, outcome: 'tos_accept_implied' };
  }

  return { stop: false, outcome: 'legal_ok' };
}

module.exports = {
  ensureFirstTimeNoticeAndTos,
};
