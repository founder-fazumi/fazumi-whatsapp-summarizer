/**
 * OpenAI Summarizer (Fazumi Ultimate Prompt) - CommonJS compatible
 *
 * Phase 4 requirements covered here:
 * - Real OpenAI summaries (toggleable via DRY_RUN)
 * - Strict JSON schema output (Structured Outputs) + WhatsApp formatting
 * - Cost controls: input char cap, output token cap, output char cap
 * - Reliability: retry (429/5xx/408), concurrency cap, no long stalls on insufficient_quota
 * - Data minimization: store:false, no logging of user text, fingerprint only
 *
 * IMPORTANT:
 * - If you use project-scoped keys (sk-proj-...), some setups require project context for write calls.
 *   Set OPENAI_PROJECT_ID to be safe.
 *
 * Docs:
 * - Responses API + instructions/input: https://platform.openai.com/docs/guides/migrate-to-responses
 * - Structured Outputs (json_schema strict): https://platform.openai.com/docs/guides/structured-outputs
 */

"use strict";

const crypto = require("crypto");

/** ---------- config helpers ---------- **/

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing required env var: ${name}`);
  return v.trim();
}

function getIntEnv(name, def) {
  const raw = process.env[name];
  if (raw == null || raw === "") return def;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return def;
  return Math.floor(n);
}

function getFloatEnv(name, def) {
  const raw = process.env[name];
  if (raw == null || raw === "") return def;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return def;
  return n;
}

function getBoolEnv(name, def) {
  const raw = process.env[name];
  if (raw == null || raw === "") return def;
  return ["1", "true", "yes", "on"].includes(String(raw).toLowerCase());
}

/** ---------- concurrency limiter (process-wide) ---------- **/

let inFlight = 0;
const waiters = [];

async function acquireSlot(maxConcurrency) {
  if (maxConcurrency <= 0) maxConcurrency = 1;
  if (inFlight < maxConcurrency) {
    inFlight += 1;
    return;
  }
  await new Promise((resolve) => waiters.push(resolve));
  inFlight += 1;
}

function releaseSlot() {
  inFlight = Math.max(0, inFlight - 1);
  const next = waiters.shift();
  if (next) next();
}

/** ---------- retry helpers ---------- **/

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableStatus(code) {
  return code === 429 || (code >= 500 && code <= 599) || code === 408;
}

function looksLikeInsufficientQuota(err) {
  const msg = String(err?.message || "").toLowerCase();
  const code = String(err?.code || err?.error?.code || "").toLowerCase();
  const type = String(err?.type || err?.error?.type || "").toLowerCase();
  return (
    code.includes("insufficient_quota") ||
    type.includes("insufficient_quota") ||
    msg.includes("insufficient_quota") ||
    msg.includes("exceeded your current quota") ||
    msg.includes("check your plan and billing")
  );
}

function backoffMs(attempt) {
  const base = 500; // 0.5s
  const cap = 8000; // 8s
  const exp = Math.min(cap, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * 250);
  return exp + jitter;
}

/** ---------- rough token estimate ---------- **/
function roughTokenEstimateFromChars(chars) {
  return Math.ceil(chars / 4);
}

/** ---------- pricing (optional estimate) ---------- **/
function getModelPricingUSDPer1M(model) {
  // Conservative defaults; update if you change models/pricing.
  const m = String(model || "").toLowerCase();
  if (m.includes("gpt-4o-mini")) return { input: 0.15, output: 0.60 };
  if (m.includes("gpt-4.1-mini")) return { input: 0.80, output: 3.20 };
  if (m.includes("gpt-4.1")) return { input: 3.00, output: 12.00 };
  return null;
}

/** ---------- OpenAI loader ---------- **/
async function loadOpenAI() {
  const mod = await import("openai");
  return mod.default || mod;
}

/** ---------- input cleanup ---------- **/

function stripSummarizePrefix(s) {
  const t = String(s || "").trim();
  if (!t) return t;
  const lower = t.toLowerCase();
  const patterns = ["summarize:", "please summarize:"];
  for (const p of patterns) {
    if (lower.startsWith(p)) return t.slice(p.length).trim();
  }
  return t;
}

/** ---------- Fazumi system prompt (short + strict extractor) ---------- **/
function buildFazumiSystemPrompt() {
  return [
    "You are Fazumi, a WhatsApp-first summarization engine.",
    "You must be a faithful extractor: do not infer or invent anything.",
    "If unclear, say so explicitly.",
    "",
    "Output must follow the provided JSON schema strictly.",
    "Language: detect dominant language; set ISO 639-1 code (en/ar/etc).",
    "Arabic override: if meaning is Arabic even in Arabizi, output Arabic script and language='ar'.",
    "",
    "Rules:",
    "- tldr: exactly 1 sentence, ~20 words max.",
    "- key_points: 2 to 6 bullets, never empty; must be grounded in text.",
    "- action_items: only if sender explicitly asks someone to do something; else [].",
    "- dates_deadlines: only literal mentions; no normalization.",
  ].join("\n");
}

/** ---------- Structured Output JSON schema ---------- **/
function fazumiJsonSchema() {
  // Structured Outputs strict schema: additionalProperties must be false and required must include all keys.
  return {
    name: "fazumi_summary",
    strict: true,
    schema: {
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
    },
  };
}

/** ---------- JSON parsing + formatting (WhatsApp-friendly) ---------- **/

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
    out.key_points = [
      "Message is very brief; intent is unclear.",
      "No additional details were provided.",
    ];
  }
  if (out.key_points.length > 6) out.key_points = out.key_points.slice(0, 6);

  return out;
}

function labelsForLanguage(lang) {
  const L = {
    ar: { tldr: "🧠 الخلاصة:", key: "📌 النقاط الرئيسية:", act: "✅ الإجراءات المطلوبة:", dat: "📅 التواريخ / المواعيد:" },
    hi: { tldr: "🧠 सारांश:", key: "📌 मुख्य बिंदु:", act: "✅ कार्य / अगला कदम:", dat: "📅 तारीख़ें / समय-सीमा:" },
    fil:{ tldr: "🧠 Buod:", key: "📌 Mahahalagang punto:", act: "✅ Mga dapat gawin:", dat: "📅 Mga petsa / deadline:" },
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

/**
 * Summarize a single WhatsApp message text.
 *
 * Returns:
 * {
 *   summaryText: string,
 *   usage: { input_tokens, output_tokens, total_tokens } | null,
 *   cost_usd_est: number | null,
 *   request_fingerprint: string,
 *   raw_json: object | null
 * }
 */
async function summarizeText({ text }) {
  const DRY_RUN = getBoolEnv("DRY_RUN", true);

  const model = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
  const projectId = (process.env.OPENAI_PROJECT_ID || "").trim(); // optional but recommended for sk-proj keys

  const maxInputChars = getIntEnv("OPENAI_MAX_INPUT_CHARS", 6000);
  const maxOutputTokensCfg = getIntEnv("OPENAI_MAX_OUTPUT_TOKENS", 450);
  const maxOutputTokens = Math.max(16, maxOutputTokensCfg); // enforce API minimum
  const maxOutputChars = getIntEnv("WHATSAPP_MAX_OUTPUT_CHARS", 1800);

  const maxRetries = getIntEnv("OPENAI_MAX_RETRIES", 4);
  const maxConcurrency = getIntEnv("OPENAI_CONCURRENCY", 1);
  const temperature = getFloatEnv("OPENAI_TEMPERATURE", 0.2);

  const safeText = stripSummarizePrefix(String(text || ""));
  const trimmed = safeText.trim();
  const clipped = trimmed.length > maxInputChars ? trimmed.slice(0, maxInputChars) : trimmed;

  const request_fingerprint = crypto
    .createHash("sha256")
    .update(`${model}::${clipped}`)
    .digest("hex");

  if (DRY_RUN) {
    const fake = normalizeSchema({
      tldr: "This is a DRY_RUN preview summary.",
      key_points: ["DRY_RUN mode is enabled.", "No OpenAI call was made."],
      action_items: [],
      dates_deadlines: [],
      language: "en",
    });

    return {
      summaryText: formatForWhatsApp(fake, maxOutputChars),
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

    const instructions = buildFazumiSystemPrompt();
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
          store: false, // data minimization (no server-side storage)
          response_format: {
            type: "json_schema",
            json_schema: fazumiJsonSchema(),
          },
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
            (
              (inTok / 1_000_000) * pricing.input +
              (outTok / 1_000_000) * pricing.output
            ).toFixed(6)
          );
        }

        return {
          summaryText: formatForWhatsApp(normalized, maxOutputChars),
          usage: usage && usage.input_tokens != null ? usage : null,
          cost_usd_est: costUsdEst,
          request_fingerprint,
          raw_json: normalized,
        };
      } catch (err) {
        lastErr = err;

        // do NOT waste retries if quota is insufficient
        if (looksLikeInsufficientQuota(err)) throw err;

        const status = err?.status ?? err?.response?.status ?? null;
        if (attempt < maxRetries && (status == null || isRetryableStatus(Number(status)))) {
          await sleep(backoffMs(attempt));
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

/**
 * ✅ Compatibility wrapper (worker.js expects this signature)
 */
async function openaiSummarize({ inputText }) {
  try {
    const model = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
    const r = await summarizeText({ text: inputText });

    return {
      ok: true,
      summary_text: r.summaryText,
      openai_model: model,
      input_tokens: r.usage?.input_tokens ?? null,
      output_tokens: r.usage?.output_tokens ?? null,
      total_tokens: r.usage?.total_tokens ?? null,
      cost_usd_est: r.cost_usd_est ?? null,
      error_code: null,
      request_fingerprint: r.request_fingerprint,
      raw_json: r.raw_json || null,
    };
  } catch (err) {
    const status = err?.status ?? err?.response?.status ?? null;

    let error_code = "openai_error";
    if (looksLikeInsufficientQuota(err)) {
      error_code = "insufficient_quota";
    } else if (status) {
      error_code = `openai_${status}`;
    }

    return {
      ok: false,
      summary_text: null,
      openai_model: (process.env.OPENAI_MODEL || "gpt-4o-mini").trim(),
      input_tokens: null,
      output_tokens: null,
      total_tokens: null,
      cost_usd_est: null,
      error_code,
    };
  }
}

module.exports = {
  summarizeText,
  openaiSummarize,
};
