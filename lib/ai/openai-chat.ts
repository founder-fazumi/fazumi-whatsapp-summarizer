import OpenAI, { APIError } from "openai";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions/completions";

const REASONING_MODEL_PREFIXES = ["gpt-5", "o1", "o3", "o4"] as const;
export const DEFAULT_SUMMARIZE_MODEL = "gpt-4o-mini";

function isReasoningChatModel(model: string) {
  const normalized = model.trim().toLowerCase();
  return REASONING_MODEL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function normalizeModel(model: string | null | undefined) {
  const normalized = model?.trim();
  return normalized ? normalized : DEFAULT_SUMMARIZE_MODEL;
}

function isInvalidModelIdError(error: unknown) {
  return (
    error instanceof APIError &&
    error.status === 400 &&
    error.message.toLowerCase().includes("invalid model id")
  );
}

export function buildJsonChatCompletionRequest(params: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxCompletionTokens: number;
}): ChatCompletionCreateParamsNonStreaming {
  return {
    model: params.model,
    max_completion_tokens: params.maxCompletionTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userPrompt },
    ],
    // GPT-5 and o-series chat models reject legacy sampling controls like temperature.
    ...(isReasoningChatModel(params.model) ? {} : { temperature: 0.2 }),
  };
}

export function resolveSummarizeModel(model = process.env.OPENAI_MODEL) {
  return normalizeModel(model);
}

async function createCompletionForModel(
  openai: OpenAI,
  params: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    maxCompletionTokens: number;
  }
): Promise<ChatCompletion> {
  return openai.chat.completions.create(
    buildJsonChatCompletionRequest({
      model: params.model,
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
      maxCompletionTokens: params.maxCompletionTokens,
    })
  );
}

export async function createJsonChatCompletionWithFallback(
  openai: OpenAI,
  params: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    maxCompletionTokens: number;
  }
): Promise<{
  completion: ChatCompletion;
  model: string;
}> {
  const model = normalizeModel(params.model);

  try {
    return {
      completion: await createCompletionForModel(openai, {
        ...params,
        model,
      }),
      model,
    };
  } catch (error) {
    if (model === DEFAULT_SUMMARIZE_MODEL || !isInvalidModelIdError(error)) {
      throw error;
    }

    console.warn(
      JSON.stringify({
        source: "lib/ai/openai-chat",
        event: "fallback_to_default_model",
        configuredModel: model,
        fallbackModel: DEFAULT_SUMMARIZE_MODEL,
        reason: "invalid model ID",
        ts: new Date().toISOString(),
      })
    );

    return {
      completion: await createCompletionForModel(openai, {
        ...params,
        model: DEFAULT_SUMMARIZE_MODEL,
      }),
      model: DEFAULT_SUMMARIZE_MODEL,
    };
  }
}
