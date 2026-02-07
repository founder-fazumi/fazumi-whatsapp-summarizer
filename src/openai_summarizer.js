/**
 * Fazumi OpenAI Summarizer (Phase 5)
 *
 * Adds MVP blockers:
 * - R1: No vague relative time in output. If user text includes relative terms, output must ground to absolute dates.
 * - R2: Batch summaries must ask for period when range > 7 days OR cannot determine range.
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
 * ✅ Rewritten: outputs "Mon 2 Feb 2026" (NO commas), matching MVP requirement examples.
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
  // We'll rebuild from parts to enforce "Mon 2 Feb 2026".
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
 * ✅ Rewritten: uses fmtAbsolute consistently, no commas.
 */
function fmtRange(d1, d2, timeZone) {
  const a = fmtAbsolute(d1, timeZone);
  const b = fmtAbsolute(d2, timeZone);
  return `${a} – ${b}`;
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
    const d = +m[1],
      mo = +m[2],
      y = m[3] ? +m[3] : null;
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
function buildFazumiSystemPrompt({ anchor_ts_iso, timezone }) {
  const tz = timezone || DEFAULT_TZ;
  const anchor = anchor_ts_iso || new Date().toISOString();

  return [
    "You are Fazumi, a WhatsApp summarizer.",
    "Return ONLY valid JSON matching the provided schema. No extra keys.",
    "Be a faithful extractor: do not invent facts.",
    "Keep it concise and WhatsApp-friendly.",
    "",
    "CRITICAL RULE (R1): Do NOT output vague relative time words (e.g., tomorrow, next week, later) unless you ALSO include an absolute date in parentheses.",
    "Example: 'tomorrow (Mon 2 Feb 2026)' or 'next week (Mon 2 Feb 2026 – Sun 8 Feb 2026)'.",
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

function normalizeSchema(obj) {
  const out = {
    tldr: "",
    key_points: [],
    action_items: [],
    dates_deadlines: [],
    language: "en",
  };

  if (!obj || typeof obj !== "object") return out;

  const tldr = typeof obj.tldr === "string" ? obj.tldr.trim() : "";
  const kp = Array.isArray(obj.key_points) ? obj.key_points : [];
  const ai = Array.isArray(obj.action_items) ? obj.action_items : [];
  const dd = Array.isArray(obj.dates_deadlines) ? obj.dates_deadlines : [];
  const lang = typeof obj.language === "string" ? obj.language.trim().toLowerCase() : "en";

  out.tldr = tldr || "Message is very brief; intent is unclear.";
  out.key_points = kp.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 6);
  out.action_items = ai.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 10);
  out.dates_deadlines = dd.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 10);
  out.language = lang || "en";

  if (out.key_points.length < 2) {
    out.key_points = ["Message is very brief; intent is unclear.", "No additional details were provided."];
  }
  if (out.key_points.length > 6) out.key_points = out.key_points.slice(0, 6);

  return out;
}

function labelsForLanguage(lang) {
  const L = {
    ar: { tldr: "🧠 الخلاصة:", key: "📌 النقاط الرئيسية:", act: "✅ الإجراءات المطلوبة:", dat: "📅 التواريخ / المواعيد:" },
    hi: { tldr: "🧠 सारांश:", key: "📌 मुख्य बिंदु:", act: "✅ कार्य / अगला कदम:", dat: "📅 तारीख़ें / समय-सीमा:" },
    fil: { tldr: "🧠 Buod:", key: "📌 Mahahalagang punto:", act: "✅ Mga dapat gawin:", dat: "📅 Mga petsa / deadline:" },
    es: { tldr: "🧠 Resumen:", key: "📌 Puntos clave:", act: "✅ Acciones:", dat: "📅 Fechas / plazos:" },
    pt: { tldr: "🧠 Resumo:", key: "📌 Pontos principais:", act: "✅ Ações:", dat: "📅 Datas / prazos:" },
    fr: { tldr: "🧠 Résumé:", key: "📌 Points clés:", act: "✅ Actions à faire:", dat: "📅 Dates / échéances:" },
    de: { tldr: "🧠 Kurzfassung:", key: "📌 Wichtige Punkte:", act: "✅ Nächste Schritte:", dat: "📅 Termine / Fristen:" },
    ko: { tldr: "🧠 요약:", key: "📌 핵심 포인트:", act: "✅ 해야 할 일:", dat: "📅 날짜 / 마감:" },
    ja: { tldr: "🧠 要約:", key: "📌 重要ポイント:", act: "✅ 対応事項:", dat: "📅 日付 / 締切:" },
    zh: { tldr: "🧠 摘要:", key: "📌 关键要点:", act: "✅ 待办事项:", dat: "📅 日期 / 截止:" },
    en: { tldr: "🧠 TL;DR:", key: "📌 Key points:", act: "✅ Action items:", dat: "📅 Dates / Deadlines:" },
  };
  return L[lang] || L.en;
}

function formatForWhatsApp(schemaObj, maxChars) {
  const obj = normalizeSchema(schemaObj);
  const L = labelsForLanguage(obj.language);

  const bullet = (arr) =>
    arr
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .map((x) => `• ${x}`)
      .join("\n");

  let out = `${L.tldr} ${String(obj.tldr || "").trim()}`.trim();

  if (obj.key_points.length) out += `\n\n${L.key}\n${bullet(obj.key_points)}`;
  if (obj.action_items.length) out += `\n\n${L.act}\n${bullet(obj.action_items)}`;
  if (obj.dates_deadlines.length) out += `\n\n${L.dat}\n${bullet(obj.dates_deadlines)}`;

  out = out.trim() || "⚠️ Unable to summarize this message. Please try again.";

  if (typeof maxChars === "number" && maxChars > 50 && out.length > maxChars) {
    out = out.slice(0, maxChars - 1).trimEnd() + "…";
  }
  return out;
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

  const request_fingerprint = crypto
    .createHash("sha256")
    .update(`${model}::${tz}::${anchor_ts_iso || ""}::${clipped}`)
    .digest("hex");

  // R2: detect batch and range early (best-effort)
  const isBatch = looksLikeBatchText(clipped);
  const range = isBatch ? detectDateRange(clipped, anchor_ts_iso, tz) : { ok: false, reason: "not_batch" };
  const needsPeriodQuestion = isBatch && (!range.ok || (range.ok && range.days > 7));

  if (DRY_RUN) {
    // ✅ IMPORTANT: include a *short, sanitized* snippet so we can PROVE R1 in DRY_RUN.
    // This is not stored and not logged; it's only sent back to the same user.
    const snippet = clipped.replace(/\s+/g, " ").slice(0, 120);

    const fake = normalizeSchema({
      tldr: `DRY_RUN preview. Snippet: ${snippet}`,
      key_points: [
        "DRY_RUN mode is enabled.",
        "No OpenAI call was made.",
        "Relative time words must be grounded with absolute dates.",
      ],
      action_items: [],
      dates_deadlines: [],
      language: "en",
    });

    let out = formatForWhatsApp(fake, maxOutputChars);
    out = enforceNoVagueRelativeTime(out, anchor_ts_iso, tz);

    if (needsPeriodQuestion) {
      out += `\n\n${buildBatchPeriodQuestion(anchor_ts_iso, tz)}`;
      out = enforceNoVagueRelativeTime(out, anchor_ts_iso, tz);
      if (out.length > maxOutputChars) out = out.slice(0, maxOutputChars - 1).trimEnd() + "…";
    }

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

    const instructions = buildFazumiSystemPrompt({ anchor_ts_iso, timezone: tz });
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

        const outText = String(resp.output_text || "").trim();
        const parsed = safeParseJsonObject(outText);
        const normalized = normalizeSchema(parsed);

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
          const outTok = usage?.output_tokens ?? roughTokenEstimateFromChars(outText.length);
          costUsdEst = Number(
            ((inTok / 1_000_000) * pricing.input + (outTok / 1_000_000) * pricing.output).toFixed(6)
          );
        }

        // Format + R1 enforcement
        let formatted = formatForWhatsApp(normalized, maxOutputChars);
        formatted = enforceNoVagueRelativeTime(formatted, anchor_ts_iso, tz);

        // R2: If batch needs a period question, append it (explicit dates)
        if (needsPeriodQuestion) {
          formatted += `\n\n${buildBatchPeriodQuestion(anchor_ts_iso, tz)}`;
          formatted = enforceNoVagueRelativeTime(formatted, anchor_ts_iso, tz);
          if (formatted.length > maxOutputChars) formatted = formatted.slice(0, maxOutputChars - 1).trimEnd() + "…";
        }

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
