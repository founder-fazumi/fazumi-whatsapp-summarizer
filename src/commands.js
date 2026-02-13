'use strict';

function normalize(text) {
  return String(text || '').trim().replace(/\s+/g, ' ').toUpperCase().replace(/[.!?]+$/g, '');
}

function parseLangCode(command) {
  const m = /^LANG\s+(AUTO|EN|AR|ES)$/.exec(command);
  if (!m) return null;
  return m[1].toLowerCase();
}

function getUserLang(user) {
  const lang = String(user?.prefs_json?.lang || 'auto').toLowerCase();
  if (lang === 'auto' || lang === 'en' || lang === 'ar' || lang === 'es') return lang;
  return 'auto';
}

function buildHelpMessage(user) {
  const currentLang = getUserLang(user);
  return [
    '🆘 Fazumi HELP',
    'HELP - Show this menu',
    'STATUS - Account status and free summaries',
    'PAY - Open secure checkout link (Basic/Pro)',
    'STOP - Opt out',
    'START - Resume summaries',
    'DELETE - Erase stored data',
    'FEEDBACK - Send feedback instructions',
    'LANG EN|AR|ES|AUTO - Set language',
    '',
    `🌐 Language: ${currentLang.toUpperCase()}`,
    'Use: LANG EN | LANG AR | LANG ES | LANG AUTO',
  ].join('\n');
}

function buildLangUpdatedMessage(code) {
  const c = String(code || 'auto').toUpperCase();
  if (c === 'AUTO') return '🌐 Language set to AUTO. Fazumi will choose based on your number/country.';
  return `🌐 Language set to ${c}.`;
}

async function updateUser(supabase, waNumber, patch) {
  const { error } = await supabase.from('users').update(patch).eq('phone_e164', waNumber);
  if (error) throw error;
}

function buildDefaultStatusMessage(user) {
  const freeLeft = Number.isFinite(Number(user?.free_remaining)) ? Number(user.free_remaining) : 0;
  const lang = getUserLang(user).toUpperCase();
  const isBlocked = user?.is_blocked === true;
  const blockedReason = String(user?.blocked_reason || '').trim();
  let account = 'FREE';
  if (isBlocked) {
    account = blockedReason ? `BLOCKED (${blockedReason})` : 'BLOCKED';
  } else if (user?.is_paid || String(user?.plan || '').toLowerCase() !== 'free') {
    const planRaw = String(user?.plan || '').trim().toLowerCase();
    if (planRaw === 'basic') account = 'PAID (Basic)';
    else if (planRaw === 'pro') account = 'PAID (Pro)';
    else account = 'PAID';
  }

  return [
    `🧾 Account status: ${account}`,
    `🎁 Free summaries left: ${freeLeft}`,
    `🌐 Language: ${lang}`,
  ].join('\n');
}

function buildDefaultPayMessage() {
  const checkoutUrl = getLemonCheckoutUrl();
  if (!checkoutUrl) {
    return [
      '💳 Upgrade your plan',
      'Choose Basic or Pro here:',
      'Checkout link is not configured yet. Admin: set LEMON_TEST_MODE and checkout URLs.',
    ].join('\n');
  }

  return [
    '💳 Upgrade your plan',
    'Choose Basic or Pro here:',
    checkoutUrl,
  ].join('\n');
}

function parseBoolEnv(value, defaultValue) {
  if (value == null) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return defaultValue;
}

function normalizeEnvString(value) {
  if (value == null) return '';
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : '';
}

function getLemonCheckoutUrl() {
  const testMode = parseBoolEnv(process.env.LEMON_TEST_MODE, true);
  const selectedRaw = testMode
    ? process.env.LEMON_CHECKOUT_URL_TEST
    : process.env.LEMON_CHECKOUT_URL_LIVE;
  const selected = normalizeEnvString(selectedRaw);
  if (!selected) return '';

  try {
    const parsed = new URL(selected);
    if (!parsed.protocol || !parsed.hostname) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

// Supports both signatures:
// 1) processCommand({ textBody, waNumber, user, supabase, sendText, nowIso, buildStatusMessage, buildPayMessage })
// 2) processCommand(waNumber, user, textBody, eventTsIso) [legacy fallback]
async function processCommand(input, legacyUser, legacyTextBody) {
  let ctx = null;
  if (typeof input === 'object' && input) {
    ctx = input;
  } else {
    ctx = {
      waNumber: input,
      user: legacyUser,
      textBody: legacyTextBody,
    };
  }

  const t = normalize(ctx.textBody);
  const waNumber = String(ctx.waNumber || '').trim();
  const user = ctx.user || {};
  const supabase = ctx.supabase || null;
  const sendText = typeof ctx.sendText === 'function' ? ctx.sendText : null;
  const nowIso = typeof ctx.nowIso === 'function' ? ctx.nowIso : () => new Date().toISOString();
  const buildStatusMessage =
    typeof ctx.buildStatusMessage === 'function'
      ? ctx.buildStatusMessage
      : buildDefaultStatusMessage;
  const buildPayMessage =
    typeof ctx.buildPayMessage === 'function' ? ctx.buildPayMessage : buildDefaultPayMessage;

  async function reply(message) {
    if (!sendText) throw new Error('sendText_missing');
    await sendText(String(message || '').trim() || '✅ Done.');
  }

  if (!t) return { handled: false };

  if (t === 'HELP') {
    await reply(buildHelpMessage(user));
    return { handled: true, action: 'help' };
  }

  if (t === 'STATUS') {
    await reply(buildStatusMessage(user));
    return { handled: true, action: 'status' };
  }

  if (t === 'PAY') {
    await reply(buildPayMessage(waNumber, user));
    return { handled: true, action: 'pay' };
  }

  if (t === 'PAUSE' || t === 'STOP') {
    if (supabase && waNumber) {
      await updateUser(supabase, waNumber, { is_blocked: true, status: 'blocked', updated_at: nowIso() });
    }
    await reply('✅ You are opted out. Reply START anytime to resume.');
    return { handled: true, action: 'stop' };
  }

  if (t === 'START') {
    if (supabase && waNumber) {
      await updateUser(supabase, waNumber, { is_blocked: false, status: 'active', updated_at: nowIso() });
    }
    await reply('✅ Summaries resumed. You can send messages for summaries again.');
    return { handled: true, action: 'start' };
  }

  if (t === 'DELETE') {
    if (supabase && waNumber) {
      const priorPrefs = user?.prefs_json && typeof user.prefs_json === 'object' ? user.prefs_json : {};
      await updateUser(supabase, waNumber, {
        prefs_json: { lang: priorPrefs.lang || 'auto' },
        free_used: 0,
        period_usage: 0,
        updated_at: nowIso(),
      });
    }
    await reply('🗑️ Stored profile data erased. STOP to opt out fully.');
    return { handled: true, action: 'delete' };
  }

  if (t === 'FEEDBACK') {
    await reply('✍️ Send your feedback in your next message prefixed with: FEEDBACK:');
    return { handled: true, action: 'feedback' };
  }

  const langCode = parseLangCode(t);
  if (langCode) {
    const supported = new Set(['auto', 'en', 'ar', 'es']);
    if (!supported.has(langCode)) {
      await reply('Unsupported language code. Use: LANG EN | LANG AR | LANG ES | LANG AUTO');
      return { handled: true, action: 'lang_invalid' };
    }

    if (supabase && waNumber) {
      const priorPrefs = user?.prefs_json && typeof user.prefs_json === 'object' ? user.prefs_json : {};
      await updateUser(supabase, waNumber, {
        prefs_json: { ...priorPrefs, lang: langCode },
        updated_at: nowIso(),
      });
    }
    await reply(buildLangUpdatedMessage(langCode));
    return { handled: true, action: `lang_${langCode}` };
  }

  return { handled: false };
}

module.exports = { processCommand, getLemonCheckoutUrl };
