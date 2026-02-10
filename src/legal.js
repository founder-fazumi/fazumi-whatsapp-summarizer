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
 */

function normalizeText(s) {
  return String(s || '').trim();
}

function isCommand(text, cmd) {
  return normalizeText(text).toUpperCase() === cmd;
}

function tailN(v, n) {
  const s = String(v || '');
  return s.length <= n ? s : s.slice(-n);
}

function quotePostgrestValue(value) {
  const s = String(value || '');
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildPhoneMatchOrClause(waNumber) {
  const raw = String(waNumber || '').trim();
  const plus = raw.startsWith('+') ? raw : `+${raw}`;
  const values = [raw, plus];

  const clauses = [];
  for (const value of values) {
    const quoted = quotePostgrestValue(value);
    clauses.push(`phone_e164.eq.${quoted}`);
    clauses.push(`phone.eq.${quoted}`);
  }
  return clauses.join(',');
}

async function setPrivacyNoticeSentIfNull(supabase, waNumber, stampIso) {
  const phoneMatchOr = buildPhoneMatchOrClause(waNumber);
  const { data, error } = await supabase
    .from('users')
    .update({
      privacy_notice_sent_at: stampIso,
      pending_notice: null,
      updated_at: stampIso,
    })
    .or(phoneMatchOr)
    .is('privacy_notice_sent_at', null)
    .select('phone_e164')
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

async function setTosAcceptedIfNull(supabase, waNumber, stampIso, tosVersion) {
  const phoneMatchOr = buildPhoneMatchOrClause(waNumber);
  const { data, error } = await supabase
    .from('users')
    .update({
      tos_accepted_at: stampIso,
      tos_version: tosVersion,
      pending_notice: null,
      updated_at: stampIso,
    })
    .or(phoneMatchOr)
    .is('tos_accepted_at', null)
    .select('phone_e164')
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
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
 * @param {Object=} opts.supabase - Supabase client
 * @param {Function=} opts.nowIso - timestamp factory
 * @param {Function=} opts.sendNoticeText - async function(message) => Promise
 * @param {string=} opts.noticeText - legal notice message body
 * @param {string=} opts.tosVersion - current ToS version string
 * @returns {Promise<LegalDecision>}
 */
async function ensureFirstTimeNoticeAndTos(waNumber, user, opts = {}) {
  const inboundText = normalizeText(opts.inbound_text);
  const toLast4 = tailN(waNumber, 4) || 'n/a';
  const privacyNull = !(user && user.privacy_notice_sent_at);
  const tosNull = !(user && user.tos_accepted_at);
  console.log(`[legal] gate_start to=${toLast4} privacy_notice_null=${privacyNull} tos_accepted_null=${tosNull}`);

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
    const supabase = opts.supabase || null;
    const now = typeof opts.nowIso === 'function' ? opts.nowIso() : new Date().toISOString();
    const noticeText = String(opts.noticeText || '').trim();
    const sendNoticeText = typeof opts.sendNoticeText === 'function' ? opts.sendNoticeText : null;

    if (!supabase) {
      console.log(`[legal] privacy_notice_skipped_db to=${toLast4} reason=missing_supabase`);
      return { stop: true, outcome: 'privacy_notice_required' };
    }

    let claimed = false;
    try {
      claimed = await setPrivacyNoticeSentIfNull(supabase, waNumber, now);
      console.log(
        `[legal] privacy_notice_claim to=${toLast4} claimed=${claimed ? 'true' : 'false'} strategy=or(phone_e164|phone raw+plus)`
      );
    } catch (e) {
      console.log(`[legal] privacy_notice_update_failed to=${toLast4}`);
      return { stop: true, outcome: 'privacy_notice_update_failed' };
    }

    if (!claimed) {
      console.log(`[legal] privacy_notice_already_claimed to=${toLast4}`);
      return { stop: true, outcome: 'privacy_notice_pending' };
    }

    if (sendNoticeText && noticeText) {
      try {
        await sendNoticeText(noticeText);
      } catch (e) {
        console.log(`[legal] privacy_notice_send_failed to=${toLast4}`);
        return { stop: true, outcome: 'privacy_notice_send_failed' };
      }
    }

    console.log(`[legal] privacy_notice_sent to=${toLast4}`);
    return { stop: true, outcome: 'privacy_notice_sent' };
  }

  // ToS acceptance is implied by continued use; worker.js should set tos_accepted_at on next message.
  // We do not stop processing here; we just provide outcome for audit if needed.
  const tosAccepted = !!(user && user.tos_accepted_at);
  if (!tosAccepted) {
    const supabase = opts.supabase || null;
    const tosVersion = String(opts.tosVersion || 'v1').trim() || 'v1';
    const now = typeof opts.nowIso === 'function' ? opts.nowIso() : new Date().toISOString();

    if (!supabase) return { stop: false, outcome: 'tos_accept_implied' };

    try {
      const updated = await setTosAcceptedIfNull(supabase, waNumber, now, tosVersion);
      console.log(
        `[legal] tos_accept_processed to=${toLast4} accepted_now=${updated ? 'true' : 'false'} version=${tosVersion} strategy=or(phone_e164|phone raw+plus)`
      );
      return { stop: false, outcome: updated ? 'tos_accepted_now' : 'tos_already_accepted' };
    } catch (e) {
      console.log(`[legal] tos_accept_update_failed to=${toLast4}`);
      return { stop: false, outcome: 'tos_accept_implied' };
    }
  }

  return { stop: false, outcome: 'legal_ok' };
}

module.exports = {
  ensureFirstTimeNoticeAndTos,
};
