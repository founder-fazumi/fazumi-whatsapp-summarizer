/**
 * Fazumi OpenAI Summarizer (Phase 5)
 *
 * Adds MVP blockers:
 * - R1: No vague relative time in output. If user text includes relative terms, output must ground to absolute dates.
 * - R2: Batch summaries must ask for period when range > 7 days OR cannot determine range.
 * - Language targeting: reply in the user's message language, with Arabic-script/Arabizi/mixed forcing Standard Arabic.
 *
 * Privacy: This module never logs message text or secrets.
 */

"use strict";

const crypto = require("crypto");

// ---------- tiny env helpers ----------
function mustGetEnv(k) {
  const v = (process.env[k] || "").trim();
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
}
function getIntEnv(k, defVal) {
  const v = Number(process.env[k] || defVal);
  return Number.isFinite(v) ? v : defVal;
}
function getFloatEnv(k, defVal) {
  const v = Number(process.env[k] || defVal);
  return Number.isFinite(v) ? v : defVal;
}
function getBoolEnv(k, defVal) {
  const s = String(process.env[k] ?? "").trim().toLowerCase();
  if (!s) return !!defVal;
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

// ---------- load openai lazily ----------
async function loadOpenAI() {
  // OpenAI SDK is ESM-first; dynamic import avoids require issues
  const mod = await import("openai");
  return mod.default || mod.OpenAI || mod;
}

// ---------- simple concurrency gate ----------
let _slots = 0;
async function acquireSlot(maxConcurrency) {
  while (_slots >= maxConcurrency) await sleep(25);
  _slots++;
}
function releaseSlot() {
  _slots = Math.max(0, _slots - 1);
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function roughTokenEstimateFromChars(chars) {
  // rough: ~4 chars/token in English; safe fallback
  const c = Math.max(0, Number(chars) || 0);
  return Math.ceil(c / 4);
}

// ---------- model pricing (optional) ----------
function getModelPricingUSDPer1M(_model) {
  // Keep minimal and safe: return null unless explicitly mapped.
  // You can extend later without changing behavior.
  return null;
}

// ---------- content helpers ----------
function stripSummarizePrefix(s) {
  // Some users might type "summarize:" etc.
  return String(s || "").replace(/^summarize\s*:\s*/i, "");
}

function detectTextDirection(text) {
  const s = String(text || "");
  const rtlScriptRe =
    /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;
  return rtlScriptRe.test(s) ? "rtl" : "ltr";
}

function wrapWithDirectionMarks(text, dir) {
  const body = String(text || "");
  const LRE = "\u202A";
  const RLE = "\u202B";
  const PDF = "\u202C";
  return (dir === "rtl" ? RLE : LRE) + body + PDF;
}

// ---------- language targeting ----------
function detectTargetLanguage(text) {
  const s = String(text || "");

  // Edge case #1 fixed: any Arabic script always forces Arabic output.
  const hasArabicScript = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/u.test(s);
  const hasLatin = /[A-Za-z]/.test(s);

  if (hasArabicScript && hasLatin) {
    return { target_lang: "ar", reason: "mixed" };
  }
  if (hasArabicScript) {
    return { target_lang: "ar", reason: "arabic_script" };
  }

  const lower = s.toLowerCase();
  const tokens = lower.match(/\b[a-z0-9']+\b/g) || [];
  const lexemeSet = new Set([
    "salam",
    "slm",
    "salaam",
    "ya",
    "ana",
    "enta",
    "enti",
    "mesh",
    "msh",
    "eh",
    "eih",
    "emta",
    "izaay",
    "izzay",
    "keda",
    "kda",
    "bardo",
    "habibi",
    "habiby",
    "habibti",
    "bukra",
    "bokra",
    "inshallah",
    "inchallah",
    "wallah",
    "yalla",
    "mafi",
    "mafesh",
    "fahim",
    "fahma",
    "fahman",
  ]);

  let lexemeHits = 0;
  for (const t of tokens) {
    if (lexemeSet.has(t)) lexemeHits++;
  }

  // Strong numeric Arabizi signal: digits inside Latin tokens and at least 2 such tokens.
  const numericArabiziTokens = tokens.filter((t) => /[a-z][2356789]|[2356789][a-z]/.test(t));
  const strongNumericArabizi = numericArabiziTokens.length >= 2;

  if (lexemeHits >= 2 || strongNumericArabizi) {
    return { target_lang: "ar", reason: "arabizi" };
  }

  return { target_lang: "en", reason: "default" };
}

function labelsForTarget(target_lang) {
  if (target_lang === "ar") {
    return {
      tldr: "الخلاصة",
      deadlines: "المواعيد النهائية",
      actions: "الإجراءات",
      keyInfo: "معلومات مهمة",
      fallback: "غير محدد",
    };
  }

  return {
    tldr: "TL;DR",
    deadlines: "Deadlines",
    actions: "Actions",
    keyInfo: "Key info",
    fallback: "Not specified",
  };
}

// ---------- R1: time utilities (Asia/Qatar) ----------
const DEFAULT_TZ = "Asia/Qatar";

function getTzDateParts(dateObj, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = dtf.formatToParts(dateObj);
  const out = {};
  for (const p of parts) out[p.type] = p.value;
  return out; // year, month, day, weekday
}

function makeQatarNoonDateFromIso(anchorIso, timeZone) {
  // Avoid midnight boundary issues: use local "noon" in Qatar.
  const base = anchorIso ? new Date(anchorIso) : new Date();
  const p = getTzDateParts(base, timeZone);

  // Build an ISO-like string using +03:00 to represent Qatar local time.
  const localNoon = `${p.year}-${p.month}-${p.day}T12:00:00+03:00`;
  const d = new Date(localNoon);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function addDaysQatar(anchorIso, days, timeZone) {
  const base = makeQatarNoonDateFromIso(anchorIso, timeZone);
  return new Date(base.getTime() + Number(days) * 24 * 60 * 60 * 1000);
}

/**
 * Rewritten: outputs "Mon 2 Feb 2026" (NO commas), matching MVP requirement examples.
 */
function fmtAbsolute(d, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Intl sometimes inserts punctuation in some environments.
  // Rebuild from parts to enforce "Mon 2 Feb 2026".
  const parts = dtf.formatToParts(d);
  const obj = {};
  for (const p of parts) obj[p.type] = p.value;

  const weekday = String(obj.weekday || "").replace(",", "").trim();
  const day = String(obj.day || "").trim();
  const month = String(obj.month || "").replace(",", "").trim();
  const year = String(obj.year || "").trim();

  return `${weekday} ${day} ${month} ${year}`.trim();
}

/**
 * Rewritten: uses fmtAbsolute consistently, no commas.
 */
function fmtRange(d1, d2, timeZone) {
  const a = fmtAbsolute(d1, timeZone);
  const b = fmtAbsolute(d2, timeZone);
  return `${a} - ${b}`;
}

function fmtTodayLabel(anchorIso, timeZone) {
  const d = makeQatarNoonDateFromIso(anchorIso, timeZone);
  return fmtAbsolute(d, timeZone);
}

function fmtThisWeekRange(anchorIso, timeZone) {
  // Define "this week" as Monday-Sunday in Qatar.
  const base = makeQatarNoonDateFromIso(anchorIso, timeZone);
  const day = base.getUTCDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const mon = new Date(base.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
  const sun = new Date(mon.getTime() + 6 * 24 * 60 * 60 * 1000);
  return fmtRange(mon, sun, timeZone);
}

function fmtThisMonthLabel(anchorIso, timeZone) {
  const base = makeQatarNoonDateFromIso(anchorIso, timeZone);
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    month: "short",
    year: "numeric",
  });

  // Make sure no commas
  return dtf.format(base).replace(",", "").trim();
}

// Enforce R1: rewrite vague relative time tokens into explicit dates.
function enforceNoVagueRelativeTime(text, anchorIso, timeZone) {
  const tz = timeZone || DEFAULT_TZ;
  const anchor = anchorIso || new Date().toISOString();

  const todayAbs = fmtTodayLabel(anchor, tz);
  const tomorrowAbs = fmtAbsolute(addDaysQatar(anchor, 1, tz), tz);
  const nextDayAbs = fmtAbsolute(addDaysQatar(anchor, 2, tz), tz);
  const weekRange = fmtThisWeekRange(anchor, tz);
  const monthLabel = fmtThisMonthLabel(anchor, tz);

  let out = String(text || "");

  const rules = [
    { re: /\btomorrow\b(?!\s*\()/gi, rep: `tomorrow (${tomorrowAbs})` },
    { re: /\bnext day\b(?!\s*\()/gi, rep: `next day (${nextDayAbs})` },
    { re: /\btoday\b(?!\s*\()/gi, rep: `today (${todayAbs})` },
    { re: /\btonight\b(?!\s*\()/gi, rep: `tonight (${todayAbs})` },
    { re: /\bthis morning\b(?!\s*\()/gi, rep: `this morning (${todayAbs})` },
    { re: /\bnext week\b(?!\s*\()/gi, rep: `next week (${weekRange})` },
    { re: /\bthis week\b(?!\s*\()/gi, rep: `this week (${weekRange})` },
    { re: /\bnext month\b(?!\s*\()/gi, rep: `next month (${monthLabel})` },
    { re: /\bthis month\b(?!\s*\()/gi, rep: `this month (${monthLabel})` },
    { re: /\blater\b(?!\s*\()/gi, rep: `later (date not specified)` },
  ];

  for (const r of rules) out = out.replace(r.re, r.rep);
  return out;
}

// ---------- R2: batch detection + range heuristics ----------
function looksLikeBatchText(text) {
  const s = String(text || "");
  const lines = s.split(/\r?\n/).filter((x) => x.trim().length > 0);
  return s.length >= 900 || lines.length >= 10;
}

function extractDateCandidates(text) {
  const s = String(text || "");
  const out = [];

  const iso = s.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g);
  for (const m of iso) out.push({ y: +m[1], mo: +m[2], d: +m[3] });

  const dmy = s.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?\b/g);
  for (const m of dmy) {
    const d = +m[1];
    const mo = +m[2];
    const y = m[3] ? +m[3] : null;
    out.push({ y, mo, d });
  }

  const monthNames = "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)";
  const mon = s.matchAll(new RegExp(`\\b(\\d{1,2})\\s+${monthNames}(?:\\s+(20\\d{2}))?\\b`, "gi"));
  const map = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    sept: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };
  for (const m of mon) {
    const d = +m[1];
    const mo = map[String(m[2] || "").toLowerCase()] || null;
    const y = m[3] ? +m[3] : null;
    if (mo) out.push({ y, mo, d });
  }

  return out;
}

function parseCandidateToDate(candidate, anchorIso, timeZone) {
  const tz = timeZone || DEFAULT_TZ;
  const anchor = anchorIso || new Date().toISOString();
  const base = makeQatarNoonDateFromIso(anchor, tz);
  const anchorParts = getTzDateParts(base, tz);

  const y = candidate.y || Number(anchorParts.year);
  const mo = candidate.mo;
  const d = candidate.d;
  if (!y || !mo || !d) return null;

  const isoLike = `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(
    2,
    "0"
  )}T12:00:00+03:00`;
  const dt = new Date(isoLike);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function detectDateRange(text, anchorIso, timeZone) {
  const tz = timeZone || DEFAULT_TZ;
  const cands = extractDateCandidates(text);
  const dates = cands
    .map((c) => parseCandidateToDate(c, anchorIso, tz))
    .filter(Boolean)
    .map((d) => d.getTime());

  if (!dates.length) return { ok: false, reason: "no_dates" };

  const min = new Date(Math.min(...dates));
  const max = new Date(Math.max(...dates));
  const days = Math.round((max.getTime() - min.getTime()) / (24 * 60 * 60 * 1000));

  return { ok: true, min, max, days };
}

function buildBatchPeriodQuestion(anchorIso, timeZone) {
  const tz = timeZone || DEFAULT_TZ;

  const todayAbs = fmtTodayLabel(anchorIso, tz);
  const week = fmtThisWeekRange(anchorIso, tz);
  const month = fmtThisMonthLabel(anchorIso, tz);

  return (
    `Do you want a summary for: ` +
    `(A) today (${todayAbs}), ` +
    `(B) this week (${week}), ` +
    `(C) this month (${month}), ` +
    `(D) custom dates?`
  );
}

// ---------- Fazumi system prompt ----------
function buildFazumiSystemPrompt({ anchor_ts_iso, timezone, target_lang }) {
  const tz = timezone || DEFAULT_TZ;
  const anchor = anchor_ts_iso || new Date().toISOString();

  const langLine = `Output ALL fields in ${target_lang}.`;
  const arabicHardRule =
    target_lang === "ar"
      ? "Write ALL fields in Modern Standard Arabic using Arabic script only. Translate English/French fragments into Arabic. Do NOT output Arabizi."
      : "Use clear, concise English for all fields.";

  return [
    "You are Fazumi, a WhatsApp summarizer.",
    "Return ONLY valid JSON matching the provided schema. No extra keys.",
    "Be a faithful extractor: do not invent facts.",
    "Keep it concise and WhatsApp-friendly.",
    langLine,
    arabicHardRule,
    "",
    "CRITICAL RULE (R1): Do NOT output vague relative time words (e.g., tomorrow, next week, later) unless you ALSO include an absolute date in parentheses.",
    "Example: 'tomorrow (Mon 2 Feb 2026)' or 'next week (Mon 2 Feb 2026 - Sun 8 Feb 2026)'.",
    "",
    `Anchor timestamp: ${anchor}`,
    `Display timezone: ${tz}`,
  ].join("\n");
}

// ---------- Structured output schema ----------
function fazumiSchemaObject() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      tldr: { type: "string" },
      key_points: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
      action_items: { type: "array", items: { type: "string" } },
      dates_deadlines: { type: "array", items: { type: "string" } },
      language: { type: "string" },
    },
    required: ["tldr", "key_points", "action_items", "dates_deadlines", "language"],
  };
}

function fazumiTextFormat() {
  return {
    type: "json_schema",
    name: "fazumi_summary",
    strict: true,
    schema: fazumiSchemaObject(),
  };
}

function fazumiTextOption() {
  return { format: fazumiTextFormat() };
}

// ---------- JSON parsing + formatting ----------
function safeParseJsonObject(s) {
  if (s && typeof s === "object" && !Array.isArray(s)) return s;

  const raw = String(s || "").trim();
  if (!raw) return null;

  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj;
  } catch {}

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = raw.slice(firstBrace, lastBrace + 1);
    try {
      const obj = JSON.parse(sliced);
      if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj;
    } catch {}
  }
  return null;
}

function coerceJsonSchemaPayload(v) {
  if (v && typeof v === "object" && !Array.isArray(v)) return v;
  if (typeof v === "string") return safeParseJsonObject(v);
  return null;
}

function extractJsonSchemaObject(resp) {
  if (!resp || !Array.isArray(resp.output) || !resp.output.length) return null;

  // Per docs primary location for structured json_schema output:
  // resp.output[0].content[0].json
  const primary = coerceJsonSchemaPayload(resp.output?.[0]?.content?.[0]?.json);
  if (primary) return primary;

  // Defensive scan in case content ordering differs.
  for (const outputItem of resp.output) {
    if (!outputItem || !Array.isArray(outputItem.content)) continue;
    for (const contentItem of outputItem.content) {
      const candidate = coerceJsonSchemaPayload(contentItem && contentItem.json);
      if (candidate) return candidate;
    }
  }

  return null;
}

function parseResponseObject(resp) {
  const structured = extractJsonSchemaObject(resp);
  if (structured) {
    return { parsed: structured, outText: String(resp?.output_text || "").trim() };
  }

  const outText = String(resp?.output_text || "").trim();
  return { parsed: safeParseJsonObject(outText), outText };
}

function oneLine(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function normalizeSchema(obj, target_lang) {
  const safeTarget = target_lang === "ar" ? "ar" : "en";
  const labels = labelsForTarget(safeTarget);

  const out = {
    tldr: "",
    key_points: [],
    action_items: [],
    dates_deadlines: [],
    language: safeTarget,
  };

  if (!obj || typeof obj !== "object") {
    out.tldr = labels.fallback;
    out.key_points = [labels.fallback];
    out.action_items = [labels.fallback];
    out.dates_deadlines = [labels.fallback];
    return out;
  }

  const tldr = typeof obj.tldr === "string" ? obj.tldr : "";
  const kp = Array.isArray(obj.key_points) ? obj.key_points : [];
  const ai = Array.isArray(obj.action_items) ? obj.action_items : [];
  const dd = Array.isArray(obj.dates_deadlines) ? obj.dates_deadlines : [];

  out.tldr = oneLine(tldr) || labels.fallback;
  out.key_points = kp.map(oneLine).filter(Boolean).slice(0, 6);
  out.action_items = ai.map(oneLine).filter(Boolean).slice(0, 10);
  out.dates_deadlines = dd.map(oneLine).filter(Boolean).slice(0, 10);

  if (!out.key_points.length) out.key_points = [labels.fallback];
  if (!out.action_items.length) out.action_items = [labels.fallback];
  if (!out.dates_deadlines.length) out.dates_deadlines = [labels.fallback];

  // Force schema language to detected target language for consistency.
  out.language = safeTarget;

  return out;
}

function truncateTextWithEllipsis(s, maxChars) {
  const text = String(s || "");
  if (text.length <= maxChars) return text;
  if (maxChars <= 1) return "…";
  return text.slice(0, maxChars - 1).trimEnd() + "…";
}

function formatForWhatsApp(schemaObj, maxChars, target_lang) {
  const safeTarget = target_lang === "ar" ? "ar" : "en";
  const labels = labelsForTarget(safeTarget);
  const obj = normalizeSchema(schemaObj, safeTarget);

  // Fixed contract: always same 4 sections, localized headers.
  let tldr = oneLine(obj.tldr) || labels.fallback;
  const deadlines = obj.dates_deadlines.length ? obj.dates_deadlines.slice() : [labels.fallback];
  const actions = obj.action_items.length ? obj.action_items.slice() : [labels.fallback];
  const keyInfo = obj.key_points.length ? obj.key_points.slice() : [labels.fallback];

  const render = () => {
    const lines = [];
    lines.push(`${labels.tldr}: ${tldr}`);
    lines.push(`${labels.deadlines}:`);
    for (const d of deadlines) lines.push(`- ${d || labels.fallback}`);
    lines.push(`${labels.actions}:`);
    for (const a of actions) lines.push(`- [ ] ${a || labels.fallback}`);
    lines.push(`${labels.keyInfo}:`);
    for (const k of keyInfo) lines.push(`- ${k || labels.fallback}`);
    return lines.join("\n");
  };

  let out = render();

  if (typeof maxChars !== "number" || maxChars <= 50 || out.length <= maxChars) {
    return out;
  }

  // Keep headers intact. Trim tail content first.
  while (out.length > maxChars && keyInfo.length > 1) {
    keyInfo.pop();
    out = render();
  }
  while (out.length > maxChars && actions.length > 1) {
    actions.pop();
    out = render();
  }
  while (out.length > maxChars && deadlines.length > 1) {
    deadlines.pop();
    out = render();
  }

  if (out.length <= maxChars) return out;

  if (keyInfo.length) {
    keyInfo[keyInfo.length - 1] = truncateTextWithEllipsis(
      keyInfo[keyInfo.length - 1],
      Math.max(1, keyInfo[keyInfo.length - 1].length - (out.length - maxChars))
    );
    out = render();
  }

  if (out.length <= maxChars) return out;

  if (actions.length) {
    actions[actions.length - 1] = truncateTextWithEllipsis(
      actions[actions.length - 1],
      Math.max(1, actions[actions.length - 1].length - (out.length - maxChars))
    );
    out = render();
  }

  if (out.length <= maxChars) return out;

  if (deadlines.length) {
    deadlines[deadlines.length - 1] = truncateTextWithEllipsis(
      deadlines[deadlines.length - 1],
      Math.max(1, deadlines[deadlines.length - 1].length - (out.length - maxChars))
    );
    out = render();
  }

  if (out.length <= maxChars) return out;

  tldr = truncateTextWithEllipsis(tldr, Math.max(1, tldr.length - (out.length - maxChars)));
  out = render();

  if (out.length <= maxChars) return out;

  return truncateTextWithEllipsis(out, maxChars);
}

// ---------- main summarizer ----------
async function summarizeText({ text, anchor_ts_iso, timezone }) {
  const DRY_RUN = getBoolEnv("DRY_RUN", true);

  const model = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
  const projectId = (process.env.OPENAI_PROJECT_ID || "").trim();

  const maxInputChars = getIntEnv("OPENAI_MAX_INPUT_CHARS", 6000);
  const maxOutputTokensCfg = getIntEnv("OPENAI_MAX_OUTPUT_TOKENS", 450);
  const maxOutputTokens = Math.max(16, maxOutputTokensCfg);
  const maxOutputChars = getIntEnv("WHATSAPP_MAX_OUTPUT_CHARS", 1800);

  const maxRetries = getIntEnv("OPENAI_MAX_RETRIES", 4);
  const maxConcurrency = getIntEnv("OPENAI_CONCURRENCY", 1);
  const temperature = getFloatEnv("OPENAI_TEMPERATURE", 0.2);

  const tz = timezone || process.env.FAZUMI_TZ || DEFAULT_TZ;

  const safeText = stripSummarizePrefix(String(text || ""));
  const trimmed = safeText.trim();
  const clipped = trimmed.length > maxInputChars ? trimmed.slice(0, maxInputChars) : trimmed;

  const langTarget = detectTargetLanguage(clipped);
  const target_lang = langTarget.target_lang;

  const request_fingerprint = crypto
    .createHash("sha256")
    .update(`${model}::${tz}::${anchor_ts_iso || ""}::${target_lang}::${clipped}`)
    .digest("hex");

  // R2: detect batch and range early (best-effort)
  const isBatch = looksLikeBatchText(clipped);
  const range = isBatch ? detectDateRange(clipped, anchor_ts_iso, tz) : { ok: false, reason: "not_batch" };
  const needsPeriodQuestion = isBatch && (!range.ok || (range.ok && range.days > 7));

  if (DRY_RUN) {
    const labels = labelsForTarget(target_lang);
    const dryDeadlineSeed = /\btomorrow\b/i.test(clipped)
      ? "tomorrow"
      : /\bnext week\b/i.test(clipped)
      ? "next week"
      : /\bthis week\b/i.test(clipped)
      ? "this week"
      : labels.fallback;
    const fake = normalizeSchema(
      {
        tldr: target_lang === "ar" ? "معاينة وضع التشغيل التجريبي." : "DRY_RUN preview.",
        key_points: [target_lang === "ar" ? "وضع التشغيل التجريبي مفعّل." : "DRY_RUN mode is enabled."],
        action_items: [],
        dates_deadlines: [dryDeadlineSeed],
        language: target_lang,
      },
      target_lang
    );

    let out = formatForWhatsApp(fake, maxOutputChars, target_lang);
    out = enforceNoVagueRelativeTime(out, anchor_ts_iso, tz);

    if (needsPeriodQuestion) {
      out += `\n\n${buildBatchPeriodQuestion(anchor_ts_iso, tz)}`;
      out = enforceNoVagueRelativeTime(out, anchor_ts_iso, tz);
      if (out.length > maxOutputChars) {
        // Keep all section headers intact, trim only the appendage/tail.
        const clippedOut = out.slice(0, maxOutputChars - 1).trimEnd() + "…";
        out = clippedOut;
      }
    }

    // Make sure empty placeholders remain aligned with required language.
    if (!out.includes(`${labels.deadlines}:`)) {
      out = formatForWhatsApp(fake, maxOutputChars, target_lang);
      out = enforceNoVagueRelativeTime(out, anchor_ts_iso, tz);
    }
    const dir = detectTextDirection(clipped) === "rtl" || target_lang === "ar" ? "rtl" : "ltr";
    out = wrapWithDirectionMarks(out, dir);

    return {
      summaryText: out,
      usage: null,
      cost_usd_est: null,
      request_fingerprint,
      raw_json: fake,
    };
  }

  const apiKey = mustGetEnv("OPENAI_API_KEY");

  await acquireSlot(maxConcurrency);
  try {
    const OpenAI = await loadOpenAI();
    const client = new OpenAI({
      apiKey,
      ...(projectId ? { project: projectId } : {}),
    });

    const instructions = buildFazumiSystemPrompt({ anchor_ts_iso, timezone: tz, target_lang });
    const input = clipped;

    let lastErr = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const resp = await client.responses.create({
          model,
          instructions,
          input,
          max_output_tokens: maxOutputTokens,
          temperature,
          store: false,
          text: fazumiTextOption(),
        });

        const parsedResult = parseResponseObject(resp);
        const normalized = normalizeSchema(parsedResult.parsed, target_lang);

        const usage = resp.usage
          ? {
              input_tokens: resp.usage.input_tokens ?? null,
              output_tokens: resp.usage.output_tokens ?? null,
              total_tokens: resp.usage.total_tokens ?? null,
            }
          : null;

        const pricing = getModelPricingUSDPer1M(model);
        let costUsdEst = null;

        if (pricing) {
          const inTok = usage?.input_tokens ?? roughTokenEstimateFromChars(instructions.length + input.length);
          const outTok = usage?.output_tokens ?? roughTokenEstimateFromChars(parsedResult.outText.length);
          costUsdEst = Number(
            ((inTok / 1_000_000) * pricing.input + (outTok / 1_000_000) * pricing.output).toFixed(6)
          );
        }

        // Always run formatter, then enforce R1.
        let formatted = formatForWhatsApp(normalized, maxOutputChars, target_lang);
        formatted = enforceNoVagueRelativeTime(formatted, anchor_ts_iso, tz);

        // R2: If batch needs a period question, append it (explicit dates)
        if (needsPeriodQuestion) {
          formatted += `\n\n${buildBatchPeriodQuestion(anchor_ts_iso, tz)}`;
          formatted = enforceNoVagueRelativeTime(formatted, anchor_ts_iso, tz);
          if (formatted.length > maxOutputChars) formatted = formatted.slice(0, maxOutputChars - 1).trimEnd() + "…";
        }
        const dir = detectTextDirection(clipped) === "rtl" || target_lang === "ar" ? "rtl" : "ltr";
        formatted = wrapWithDirectionMarks(formatted, dir);

        return {
          summaryText: formatted,
          usage: usage && usage.input_tokens != null ? usage : null,
          cost_usd_est: costUsdEst,
          request_fingerprint,
          raw_json: normalized,
        };
      } catch (err) {
        lastErr = err;
        const status = err?.status ?? err?.response?.status ?? null;
        const retryable = status == null || [408, 429, 500, 502, 503, 504].includes(Number(status));
        if (attempt < maxRetries && retryable) {
          await sleep(Math.min(2000, 250 * Math.pow(2, attempt)));
          continue;
        }
        throw err;
      }
    }

    throw lastErr || new Error("OpenAI summarize failed (unknown)");
  } finally {
    releaseSlot();
  }
}

module.exports = {
  summarizeText,
};
