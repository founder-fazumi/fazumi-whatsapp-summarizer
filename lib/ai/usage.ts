const MODEL_PRICING = {
  "gpt-4o-mini": {
    inputPer1M: 0.15,
    outputPer1M: 0.6,
    recommendedRequestsPerMinute: 120,
  },
  "gpt-4o": {
    inputPer1M: 2.5,
    outputPer1M: 10,
    recommendedRequestsPerMinute: 60,
  },
} as const;

function parsePositiveNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function estimateTokenCount(text: string) {
  if (!text) {
    return 0;
  }

  return Math.max(Math.ceil(text.length / 4), 1);
}

export function resolveAiPricing(model: string) {
  const configuredInput = parsePositiveNumber(process.env.OPENAI_INPUT_COST_PER_1M);
  const configuredOutput = parsePositiveNumber(process.env.OPENAI_OUTPUT_COST_PER_1M);
  const catalogEntry =
    MODEL_PRICING[model as keyof typeof MODEL_PRICING] ?? MODEL_PRICING["gpt-4o-mini"];

  return {
    inputPer1M: configuredInput ?? catalogEntry.inputPer1M,
    outputPer1M: configuredOutput ?? catalogEntry.outputPer1M,
    recommendedRequestsPerMinute: catalogEntry.recommendedRequestsPerMinute,
  };
}

export function estimateAiCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number
) {
  const pricing = resolveAiPricing(model);
  const inputCost = (promptTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPer1M;

  return Number((inputCost + outputCost).toFixed(6));
}
