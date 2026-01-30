/**
 * OpenAI Summarizer (Phase 4) - CommonJS compatible
 * - TEXT ONLY
 * - Hard caps (input chars, output tokens)
 * - Retry with exponential backoff + jitter for 429/5xx/timeouts
 * - Simple concurrency limiter (process-wide) to cap parallel OpenAI calls
 * - Cost estimate based on OpenAI pricing page
 *
 * Uses OpenAI Responses API (recommended in docs).
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

/** ---------- pricing for cost estimate ---------- **/
function getModelPricingUSDPer1M(model) {
  // Keep this conservative; you can update later if you change models.
  const m = String(model || "").toLowerCase();
  if (m.includes("gpt-4o-mini")) return { input: 0.15, output: 0.60 };
  if (m.includes("gpt-4.1-mini")) return { input: 0.80, output: 3.20 };
  if (m.includes("gpt-4.1")) return { input: 3.00, output: 12.00 };
  return null;
}

/**
 * Lazy-load OpenAI SDK inside a CommonJS project.
 * Returns OpenAI constructor/class.
 */
async function loadOpenAI() {
  // Works in CommonJS even if the package is ESM
  const mod = await import("openai");
  return mod.default || mod;
}

/**
 * Summarize a single WhatsApp message text.
 *
 * Returns:
 * {
 *   summaryText: string,
 *   usage: { input_tokens, output_tokens, total_tokens } | null,
 *   cost_usd_est: number | null,
 *   request_fingerprint: string
 * }
 */
async function summarizeText({ text }) {
  const DRY_RUN = getBoolEnv("DRY_RUN", true);
  const model = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();

  const maxInputChars = getIntEnv("OPENAI_MAX_INPUT_CHARS", 6000);
  const maxOutputTokens = getIntEnv("OPENAI_MAX_OUTPUT_TOKENS", 220);
  const maxRetries = getIntEnv("OPENAI_MAX_RETRIES", 4);
  const maxConcurrency = getIntEnv("OPENAI_CONCURRENCY", 1);

  const safeText = String(text || "");
  const trimmed = safeText.trim();
  const clipped = trimmed.length > maxInputChars ? trimmed.slice(0, maxInputChars) : trimmed;

  const request_fingerprint = crypto
    .createHash("sha256")
    .update(`${model}::${clipped}`)
    .digest("hex");

  if (DRY_RUN) {
    return {
      summaryText: `DRY_RUN summary (${Math.min(clipped.length, maxInputChars)} chars).`,
      usage: null,
      cost_usd_est: null,
      request_fingerprint,
    };
  }

  // Don’t even load SDK unless needed.
  mustGetEnv("OPENAI_API_KEY");

  await acquireSlot(maxConcurrency);
  try {
    const OpenAI = await loadOpenAI();
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const system = [
      "You summarize a single WhatsApp message.",
      "Return a concise, helpful summary in plain English.",
      "No markdown.",
      "Max 2 short sentences.",
      "If the message is not meaningful, reply: 'Please send a message to summarize.'",
    ].join(" ");

    const user = clipped;

    let lastErr = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Responses API (recommended)
        const resp = await client.responses.create({
          model,
          input: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_output_tokens: maxOutputTokens,
        });

        const outText = String(resp.output_text || "").trim();

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
          const inTok =
            usage?.input_tokens ?? roughTokenEstimateFromChars(system.length + 2 + user.length);
          const outTok = usage?.output_tokens ?? roughTokenEstimateFromChars(outText.length);

          costUsdEst = Number(
            (
              (inTok / 1_000_000) * pricing.input +
              (outTok / 1_000_000) * pricing.output
            ).toFixed(6)
          );
        }

        return {
          summaryText: outText || "Please send a message to summarize.",
          usage: usage && usage.input_tokens != null ? usage : null,
          cost_usd_est: costUsdEst,
          request_fingerprint,
        };
      } catch (err) {
        lastErr = err;
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
 * ✅ Compatibility wrapper for worker.js
 * Worker expects: openaiSummarize({ inputText }) -> { ok, summary_text, openai_model, tokens..., cost_usd_est, error_code }
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
    };
  } catch (err) {
    const status = err?.status ?? err?.response?.status ?? null;
    return {
      ok: false,
      summary_text: null,
      openai_model: (process.env.OPENAI_MODEL || "gpt-4o-mini").trim(),
      input_tokens: null,
      output_tokens: null,
      total_tokens: null,
      cost_usd_est: null,
      error_code: status ? `openai_${status}` : "openai_error",
    };
  }
}

module.exports = {
  summarizeText,
  openaiSummarize,
};
