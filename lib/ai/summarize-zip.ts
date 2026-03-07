import OpenAI from "openai";
import { estimateAiCostUsd, estimateTokenCount } from "@/lib/ai/usage";
import type { LangPref, SummaryResult, SummaryUsage } from "@/lib/ai/summarize";
import { toImportantDateArray, parseChatType, parseChatContext } from "@/lib/ai/summarize";

export type ZipFactCategory = "events" | "tasks" | "deadlines" | "supplies" | "exams";

export interface ZipFactItem {
  kind: ZipFactCategory;
  title: string;
  date: string | null;
  class_name: string | null;
  details: string | null;
  display: string;
  dedupe_key: string;
}

export interface ZipFactsBlock {
  events: ZipFactItem[];
  tasks: ZipFactItem[];
  deadlines: ZipFactItem[];
  supplies: ZipFactItem[];
  exams: ZipFactItem[];
}

const FACT_CATEGORIES: ZipFactCategory[] = ["events", "tasks", "deadlines", "supplies", "exams"];

const ZIP_SYSTEM_PROMPT = `You are Fazumi, an AI assistant that summarizes school WhatsApp group chats for parents.

You will receive ONLY new messages from a single school chat group. Return a JSON object with EXACTLY these keys:

{
  "tldr": "A 2-3 sentence summary of only the important new information in these messages.",
  "important_dates": ["Specific dates, times, deadlines, or event reminders mentioned in the new messages."],
  "action_items": ["Specific things parents or students need to do based on the new messages."],
  "people_classes": ["Teachers, staff, people, classes, grades, or subjects mentioned."],
  "links": ["URLs, portals, or file references mentioned."],
  "questions": ["Questions parents may need to ask for clarification."],
  "facts": {
    "events": [
      {
        "title": "Short title",
        "date": "Absolute date/time if available, else empty string",
        "class_name": "Grade/class/subject if available, else empty string",
        "details": "Short details if needed, else empty string",
        "display": "Human-readable list item in the output language",
        "dedupe_key": "normalized-title|normalized-date|event|normalized-class"
      }
    ],
    "tasks": [same shape],
    "deadlines": [same shape],
    "supplies": [same shape],
    "exams": [same shape]
  }
}

RULES:
- Use absolute dates, never relative words like "tomorrow" or "next week" without resolving them.
- Keep the output concise and parent-friendly.
- Follow the requested output language exactly. If the output language is not specified, reply in the same language as the messages.
- Never include raw quoted chat transcripts in the output.
- Put each structured fact into the correct category. If a category has nothing, return [].
- Make dedupe_key deterministic and low-variance: lowercase, concise, and based on title + date + type + class_name.
- If the messages are too short or unclear, use a short tldr note and return empty arrays.

Return ONLY valid JSON. No markdown code blocks. No explanation outside the JSON.`;

let openAiClient: OpenAI | null = null;

function getOpenAI() {
  if (!openAiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    openAiClient = new OpenAI({ apiKey });
  }

  return openAiClient;
}

function detectInputLanguage(text: string): "en" | "ar" {
  const arabicChars = text.match(/[\u0600-\u06FF]/g)?.length ?? 0;
  const latinChars = text.match(/[A-Za-z]/g)?.length ?? 0;

  if (arabicChars === 0) {
    return "en";
  }

  if (latinChars === 0) {
    return "ar";
  }

  return arabicChars >= latinChars ? "ar" : "en";
}

function resolveOutputLanguage(text: string, langPref: LangPref) {
  return langPref === "auto" ? detectInputLanguage(text) : langPref;
}

function buildUserPrompt(text: string, outputLang: "en" | "ar") {
  const langInstruction =
    outputLang === "en"
      ? "IMPORTANT: Reply in English only, even if the source messages include Arabic."
      : "IMPORTANT: Reply in Standard Arabic (فصحى) only, even if the source messages include English.";

  return `Here are the new chat messages to summarize:

---
${text.slice(0, 30000)}
---

${langInstruction}`;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function toNullableString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function buildDisplayFallback(title: string, date: string | null, details: string | null) {
  const parts = [title, date, details].filter((part): part is string => Boolean(part && part.trim()));
  return parts.join(" - ");
}

function parseFactArray(category: ZipFactCategory, value: unknown): ZipFactItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = item as Record<string, unknown> | null;
      if (!record || typeof record !== "object") {
        return null;
      }

      const title = String(record.title ?? "").trim();
      const date = toNullableString(record.date);
      const className = toNullableString(record.class_name);
      const details = toNullableString(record.details);
      const display = String(record.display ?? "").trim() || buildDisplayFallback(title, date, details);
      const dedupeKey = String(record.dedupe_key ?? "").trim();

      if (!title || !display) {
        return null;
      }

      return {
        kind: category,
        title,
        date,
        class_name: className,
        details,
        display,
        dedupe_key: dedupeKey,
      } satisfies ZipFactItem;
    })
    .filter((item): item is ZipFactItem => Boolean(item));
}

function parseFacts(value: unknown): ZipFactsBlock {
  const record = value as Record<string, unknown> | null;

  return {
    events: parseFactArray("events", record?.events),
    tasks: parseFactArray("tasks", record?.tasks),
    deadlines: parseFactArray("deadlines", record?.deadlines),
    supplies: parseFactArray("supplies", record?.supplies),
    exams: parseFactArray("exams", record?.exams),
  };
}

function buildUsage(
  model: string,
  promptTokens: number,
  completionTokens: number,
  estimatedCostUsd?: number
): SummaryUsage {
  return {
    model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedCostUsd:
      estimatedCostUsd ?? estimateAiCostUsd(model, promptTokens, completionTokens),
  };
}

function parseModelPayload(raw: string, outputLang: "en" | "ar") {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  const summary: SummaryResult = {
    tldr: String(parsed.tldr ?? "").trim(),
    important_dates: toImportantDateArray(parsed.important_dates),
    action_items: toStringArray(parsed.action_items),
    urgent_action_items: toStringArray(parsed.urgent_action_items),
    people_classes: toStringArray(parsed.people_classes),
    contacts: toStringArray(parsed.contacts),
    links: toStringArray(parsed.links),
    questions: toStringArray(parsed.questions),
    chat_type: parseChatType(parsed.chat_type),
    chat_context: parseChatContext(parsed.chat_context),
    lang_detected: outputLang,
    char_count: 0,
  };

  return {
    summary,
    facts: parseFacts(parsed.facts),
  };
}

function tryReadPlaywrightOverride(encoded: string | null) {
  if (!encoded || process.env.PLAYWRIGHT_TEST !== "1") {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      summary?: Record<string, unknown>;
      facts?: Record<string, unknown>;
      usage?: {
        promptTokens?: number;
        completionTokens?: number;
        estimatedCostUsd?: number;
      };
    };
  } catch {
    throw new Error("Invalid x-fazumi-test-ai-response header");
  }
}

function buildOverridePayload(
  override: NonNullable<ReturnType<typeof tryReadPlaywrightOverride>>,
  outputLang: "en" | "ar",
  inputText: string
) {
  const summarySource = override.summary ?? {};
  const factsSource = override.facts ?? {};
  const usage = override.usage ?? {};

  const summary: SummaryResult = {
    tldr: String(summarySource.tldr ?? "").trim(),
    important_dates: toImportantDateArray(summarySource.important_dates),
    action_items: toStringArray(summarySource.action_items),
    urgent_action_items: toStringArray(summarySource.urgent_action_items),
    people_classes: toStringArray(summarySource.people_classes),
    contacts: toStringArray(summarySource.contacts),
    links: toStringArray(summarySource.links),
    questions: toStringArray(summarySource.questions),
    chat_type: parseChatType(summarySource.chat_type),
    chat_context: parseChatContext(summarySource.chat_context),
    lang_detected: outputLang,
    char_count: inputText.length,
  };

  return {
    summary,
    facts: parseFacts(factsSource),
    usage: buildUsage(
      "playwright-override",
      usage.promptTokens ?? estimateTokenCount(inputText),
      usage.completionTokens ?? 0,
      usage.estimatedCostUsd ?? 0
    ),
  };
}

export async function summarizeZipMessages(
  text: string,
  langPref: LangPref,
  options?: {
    testAiResponseHeader?: string | null;
  }
): Promise<{
  summary: SummaryResult;
  facts: ZipFactsBlock;
  usage: SummaryUsage;
}> {
  const outputLang = resolveOutputLanguage(text, langPref);
  const override = tryReadPlaywrightOverride(options?.testAiResponseHeader ?? null);

  if (override) {
    return buildOverridePayload(override, outputLang, text);
  }

  const openai = getOpenAI();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const userPrompt = buildUserPrompt(text, outputLang);
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: 1400,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: ZIP_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const { summary, facts } = parseModelPayload(raw, outputLang);
  summary.char_count = text.length;

  const promptTokens =
    completion.usage?.prompt_tokens ?? estimateTokenCount(`${ZIP_SYSTEM_PROMPT}\n${userPrompt}`);
  const completionTokens =
    completion.usage?.completion_tokens ?? estimateTokenCount(raw);

  return {
    summary,
    facts,
    usage: buildUsage(model, promptTokens, completionTokens),
  };
}

export function listZipFactItems(facts: ZipFactsBlock) {
  return FACT_CATEGORIES.flatMap((category) => facts[category]);
}

