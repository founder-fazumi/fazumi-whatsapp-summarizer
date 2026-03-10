import OpenAI from "openai";
import {
  createJsonChatCompletionWithFallback,
  resolveSummarizeModel,
} from "@/lib/ai/openai-chat";
import { estimateAiCostUsd, estimateTokenCount } from "@/lib/ai/usage";
import type { ImportSourcePlatform } from "@/lib/chat-import/source-detect";
import type { FamilyContext } from "@/lib/family-context";
import { buildFamilyContextPrompt } from "@/lib/family-context";

export type LangPref = "auto" | "en" | "ar";

export interface ImportantDate {
  label: string;
  date: string | null;
  time: string | null;
  location: string | null;
  urgent: boolean;
}

export type ChatType =
  | "routine_update"
  | "urgent_notice"
  | "event_announcement"
  | "noisy_general_chat";

export interface ChatContext {
  message_count_estimate: number | null;
  date_range: string | null;
  source_platform?: ImportSourcePlatform | null;
  group_title?: string | null;
  school_name?: string | null;
  child_name?: string | null;
  class_name?: string | null;
}

export interface SummaryResult {
  tldr: string;
  important_dates: ImportantDate[];
  action_items: string[];
  urgent_action_items: string[];
  people_classes: string[];
  contacts: string[];
  links: string[];
  questions: string[];
  chat_type: ChatType;
  chat_context: ChatContext;
  lang_detected: string;
  char_count: number;
}

export interface SummaryUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

type ResolvedLang = Exclude<LangPref, "auto">;

export interface SummaryPromptContext {
  sourcePlatform?: ImportSourcePlatform | null;
  groupTitle?: string | null;
  familyContext?: FamilyContext | null;
}

const SYSTEM_PROMPT = `You are Fazumi, an AI assistant that turns school parent chats into an action-ready family dashboard.

The source may be pasted from WhatsApp, Telegram, or Facebook parent groups.

Analyze the provided chat text and return a JSON object with EXACTLY these fields (no extra keys):

{
  "tldr": "A calm 2-3 sentence plain-language summary of the most important points for a family dashboard.",
  "important_dates": [
    {
      "label": "Human-readable description e.g. 'Parent meeting at school hall'",
      "date": "ISO date YYYY-MM-DD if determinable, else null",
      "time": "24h time HH:MM if mentioned, else null",
      "location": "Location if mentioned, else null",
      "urgent": true if the event is today or tomorrow relative to the most recent message, otherwise false
    }
  ],
  "action_items": ["All things parents or students need to DO. Include fees, forms, permission slips, portal uploads, supplies, and reminders when relevant. If none, return empty array."],
  "urgent_action_items": ["Strict subset of action_items due today or tomorrow only — same exact wording. If none, return empty array."],
  "people_classes": ["Names of teachers, people, subjects, or class sections mentioned. If none, return empty array."],
  "contacts": ["Phone numbers, email addresses, or explicit contact details shared in the chat. Do NOT invent. If none, return empty array."],
  "links": ["URLs, file references, or attachments mentioned in the chat. If none, return empty array."],
  "questions": ["Questions a parent should ask the teacher or school to clarify anything important. If none, return empty array."],
  "chat_type": "One of: routine_update | urgent_notice | event_announcement | noisy_general_chat",
  "chat_context": {
    "message_count_estimate": <estimated number of messages as integer, or null if unclear>,
    "date_range": "Human-readable date range covered e.g. 'March 3-7, 2026', or null if unclear"
  }
}

RULES:
- Use absolute dates in labels (e.g. "Monday Feb 24" not "tomorrow" or "next week").
- date field must be ISO format YYYY-MM-DD. If year is ambiguous, use the current year.
- urgent: true only if the event or deadline is within the next 48 hours of the most recent message date.
- urgent_action_items must be a strict subset of action_items with identical wording.
- The output will feed these buckets: Due today, Upcoming dates, Payments/forms, Supplies, Questions, and Urgent items. Write with those buckets in mind.
- Explicitly call out payments, forms, permission slips, supplies to bring, portal uploads, school-fee reminders, and approval requests when they matter.
- When a task has a due date or time, include that exact date or time in the action item wording.
- Preserve local currency wording exactly as written when possible, especially SAR, AED, QAR, KWD, BHD, OMR, and USD.
- contacts: only explicitly stated phone numbers, emails, or contact handles — never invent.
- chat_type values: "routine_update" = regular school news; "urgent_notice" = requires immediate action; "event_announcement" = specific upcoming event; "noisy_general_chat" = mostly off-topic chatter with little actionable content.
- Be concise. Bullet points, not paragraphs, for list fields.
- Follow the output language requested in the user message. If no output language is requested, reply in the SAME language as the chat.
- If saved family context is provided, use it only to disambiguate names, classes, recurring links, and expected currency. Never invent facts that are not supported by the chat.
- Never include raw message text in your output.
- If the chat is too short or unclear to summarize, set tldr to a brief note explaining that, and return empty arrays and safe defaults for all other fields.

Return ONLY valid JSON. No markdown code blocks. No explanation outside the JSON.`;

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    _openai = new OpenAI({ apiKey });
  }

  return _openai;
}

function detectInputLanguage(text: string): ResolvedLang {
  const arabicChars = text.match(/[\u0600-\u06FF]/g)?.length ?? 0;
  const latinChars = text.match(/[A-Za-z]/g)?.length ?? 0;
  const totalAlpha = arabicChars + latinChars;

  if (totalAlpha === 0) return "en";

  // Arabic wins if >= 30% of alphabetic chars are Arabic.
  // Old threshold of 50% incorrectly flipped on mixed EN/AR Gulf school chats.
  return arabicChars / totalAlpha >= 0.3 ? "ar" : "en";
}

function resolveOutputLanguage(text: string, langPref: LangPref): ResolvedLang {
  return langPref === "auto" ? detectInputLanguage(text) : langPref;
}

function buildUserMessage(
  text: string,
  outputLang: ResolvedLang,
  context?: SummaryPromptContext
): string {
  const langInstruction =
    outputLang === "en"
      ? "\n\nIMPORTANT: Reply in English only, regardless of the chat language."
      : "\n\nIMPORTANT: Reply in Standard Arabic (فصحى) only, regardless of the chat language.";
  const familyContext = context?.familyContext ? buildFamilyContextPrompt(context.familyContext) : null;
  const metaLines = [
    context?.sourcePlatform ? `Source platform: ${context.sourcePlatform}` : null,
    context?.groupTitle ? `Saved group name: ${context.groupTitle}` : null,
    familyContext,
  ].filter((line): line is string => Boolean(line));
  const metaBlock = metaLines.length > 0
    ? `\n\nUse this saved context only to reduce ambiguity:\n${metaLines.join("\n")}`
    : "";

  return `Here is the school chat to summarize:

${metaBlock}

---
${text.slice(0, 30000)}
---
${langInstruction}`;
}

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) {
    return [];
  }

  return val.map((value) => String(value)).filter(Boolean);
}

export function toImportantDateArray(val: unknown): ImportantDate[] {
  if (!Array.isArray(val)) return [];

  return val.flatMap<ImportantDate>((item) => {
    if (typeof item === "string" && item.trim()) {
      // Backward compat: wrap legacy plain-string format from old summaries
      return [{ label: item.trim(), date: null, time: null, location: null, urgent: false }];
    }

    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      const label = String(obj.label ?? "").trim();
      if (!label) return [];

      return [{
        label,
        date: typeof obj.date === "string" && obj.date ? obj.date : null,
        time: typeof obj.time === "string" && obj.time ? obj.time : null,
        location: typeof obj.location === "string" && obj.location ? obj.location : null,
        urgent: Boolean(obj.urgent),
      }];
    }

    return [];
  });
}

export function parseChatType(val: unknown): ChatType {
  const valid: ChatType[] = [
    "routine_update",
    "urgent_notice",
    "event_announcement",
    "noisy_general_chat",
  ];
  return valid.includes(val as ChatType) ? (val as ChatType) : "routine_update";
}

export function parseChatContext(val: unknown): ChatContext {
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    return {
      message_count_estimate:
        typeof obj.message_count_estimate === "number"
          ? Math.round(obj.message_count_estimate)
          : null,
      date_range:
        typeof obj.date_range === "string" && obj.date_range ? obj.date_range : null,
      source_platform:
        obj.source_platform === "whatsapp" ||
        obj.source_platform === "telegram" ||
        obj.source_platform === "facebook"
          ? obj.source_platform
          : null,
      group_title:
        typeof obj.group_title === "string" && obj.group_title ? obj.group_title : null,
      school_name:
        typeof obj.school_name === "string" && obj.school_name ? obj.school_name : null,
      child_name:
        typeof obj.child_name === "string" && obj.child_name ? obj.child_name : null,
      class_name:
        typeof obj.class_name === "string" && obj.class_name ? obj.class_name : null,
    };
  }
  return { message_count_estimate: null, date_range: null };
}

export function applySummaryPromptContext(
  summary: SummaryResult,
  context?: SummaryPromptContext
): SummaryResult {
  if (!context) {
    return summary;
  }

  return {
    ...summary,
    chat_context: {
      ...summary.chat_context,
      source_platform: context.sourcePlatform ?? null,
      group_title: context.groupTitle ?? null,
      school_name: context.familyContext?.school_name ?? null,
      child_name: context.familyContext?.child_name ?? null,
      class_name: context.familyContext?.class_name ?? null,
    },
  };
}

function buildUsage(
  model: string,
  promptTokens: number,
  completionTokens: number
): SummaryUsage {
  return {
    model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedCostUsd: estimateAiCostUsd(model, promptTokens, completionTokens),
  };
}

export async function summarizeChat(
  text: string,
  langPref: LangPref = "auto",
  context?: SummaryPromptContext
): Promise<{
  summary: SummaryResult;
  usage: SummaryUsage;
}> {
  const openai = getOpenAI();
  const model = resolveSummarizeModel();
  const outputLang = resolveOutputLanguage(text, langPref);
  const userPrompt = buildUserMessage(text, outputLang, context);

  const { completion, model: resolvedModel } =
    await createJsonChatCompletionWithFallback(openai, {
      model,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxCompletionTokens: 2000,
    });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  const summary: SummaryResult = {
    tldr: String(parsed.tldr ?? ""),
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
    char_count: text.length,
  };

  const promptTokens =
    completion.usage?.prompt_tokens ?? estimateTokenCount(userPrompt);
  const completionTokens =
    completion.usage?.completion_tokens ?? estimateTokenCount(raw);

  return {
    summary: applySummaryPromptContext(summary, context),
    usage: buildUsage(resolvedModel, promptTokens, completionTokens),
  };
}
