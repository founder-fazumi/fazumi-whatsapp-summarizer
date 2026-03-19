import OpenAI from "openai";
import {
  createJsonChatCompletionWithFallback,
  resolveSummarizeModel,
} from "@/lib/ai/openai-chat";
import { estimateAiCostUsd, estimateTokenCount } from "@/lib/ai/usage";
import type { ImportSourcePlatform } from "@/lib/chat-import/source-detect";
import type { FamilyContext } from "@/lib/family-context";
import { buildFamilyContextPrompt } from "@/lib/family-context";

export type LangPref = "auto" | "en" | "ar" | "es" | "pt-BR" | "id" | "hi" | "ur";

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

type ResolvedLang = Exclude<LangPref, "auto"> | "detect";

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
- date field must be ISO format YYYY-MM-DD. Only include a year if it is explicitly stated in the chat text or the chat messages make the year unambiguous. If the year is uncertain, use the current year only if the month and day are plausible for this year. Do NOT assume a past year unless the original text explicitly states it.
- If a weekday name (e.g. "Monday") and a specific calendar date (e.g. "March 5") are both given for the same event but do not match, add " — verify date in original message" to the label and set date to null.
- If a date or deadline cannot be determined with reasonable confidence from the chat text, add " — check original message" to the label and return null for the date field. Never invent a specific date.
- urgent: true only if the event or deadline is within the next 48 hours of the most recent message date, and the date is clearly determinable. If the date is uncertain, set urgent to false.
- urgent_action_items must be a strict subset of action_items with identical wording.
- The output will feed these buckets: Due today, Upcoming dates, Payments/forms, Supplies, Questions, and Urgent items. Write with those buckets in mind.
- Explicitly call out payments, forms, permission slips, supplies to bring, portal uploads, school-fee reminders, and approval requests when they matter.
- When a task has a due date or time, include that exact date or time in the action item wording.
- Preserve local currency wording exactly as written when possible, especially SAR, AED, QAR, KWD, BHD, OMR, and USD.
- contacts: only explicitly stated phone numbers, emails, or contact handles — never invent.
- chat_type values: "routine_update" = regular school news; "urgent_notice" = requires immediate action; "event_announcement" = specific upcoming event; "noisy_general_chat" = mostly off-topic chatter with little actionable content.
- Be concise. Bullet points, not paragraphs, for list fields.
- Follow the output language requested in the user message. Supported output languages include English, Arabic (Standard Arabic / فصحى), Spanish, Brazilian Portuguese, Bahasa Indonesia, Hindi, and Urdu. If no output language is requested, reply in the SAME language as the chat.
- For mixed-language chats (e.g. Arabic + English, Hindi + English), produce the entire summary in the single requested output language.
- Preserve proper nouns (teacher names, school names, class names, subject names) in their original form. Do not translate them.
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

// Per-language output instructions injected into the user message.
// "detect" means no explicit instruction — the system prompt default applies
// (reply in the same language as the chat).
const LANG_INSTRUCTIONS: Record<Exclude<ResolvedLang, "detect">, string> = {
  en:      "Reply in English only, regardless of the chat language.",
  ar:      "Reply in Standard Arabic (فصحى) only, regardless of the chat language.",
  es:      "Reply in Spanish only, regardless of the chat language.",
  "pt-BR": "Reply in Brazilian Portuguese only, regardless of the chat language.",
  id:      "Reply in Bahasa Indonesia only, regardless of the chat language.",
  hi:      "Reply in Hindi only, regardless of the chat language.",
  ur:      "Reply in Urdu only, regardless of the chat language.",
};

function detectInputLanguage(text: string): ResolvedLang {
  const arabicChars = text.match(/[\u0600-\u06FF]/g)?.length ?? 0;
  const devanagariChars = text.match(/[\u0900-\u097F]/g)?.length ?? 0;
  const latinChars = text.match(/[A-Za-z]/g)?.length ?? 0;
  const totalAlpha = arabicChars + latinChars + devanagariChars;

  if (totalAlpha === 0) return "detect";

  // Arabic-script block wins if >= 30% of alphabetic chars are in U+0600–U+06FF.
  if (arabicChars / totalAlpha >= 0.3) {
    // Distinguish Urdu from Arabic within the shared Arabic script block.
    // ں (U+06BA, Noon Ghunna) and ے (U+06D2, Barri Ye) are Urdu-exclusive:
    // they appear in virtually every Urdu sentence but are absent from standard
    // Arabic. A 2 % threshold is conservative — typical Urdu text runs 8–15 %.
    const urduExclusive = text.match(/[\u06BA\u06D2]/g)?.length ?? 0;
    if (arabicChars > 0 && urduExclusive / arabicChars >= 0.02) return "ur";
    return "ar";
  }

  // Devanagari detection for Hindi-dominant chats.
  if (devanagariChars / totalAlpha >= 0.3) return "hi";

  // For Latin-script languages (ES, PT-BR, ID, EN) we let the model detect
  // and reply in the same language as the chat per the system prompt default.
  return "detect";
}

function resolveOutputLanguage(text: string, langPref: LangPref): ResolvedLang {
  if (langPref === "auto") return detectInputLanguage(text);
  return langPref;
}

function buildUserMessage(
  text: string,
  outputLang: ResolvedLang,
  context?: SummaryPromptContext
): string {
  const instruction = outputLang !== "detect" ? LANG_INSTRUCTIONS[outputLang] : null;
  const langInstruction = instruction ? `\n\nIMPORTANT: ${instruction}` : "";
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

// ---------------------------------------------------------------------------
// Deterministic post-AI date safety layer
// ---------------------------------------------------------------------------

// [regex, JS day index (0=Sun … 6=Sat)]
// Arabic patterns use /u flag and match with or without "يوم " prefix and
// with or without the definite article "ال", covering common LLM output
// variations. Label text is NFC-normalized before matching (see below).
const WEEKDAY_PATTERNS: Array<[RegExp, number]> = [
  [/\bSunday\b/i, 0],
  [/\bMonday\b/i, 1],
  [/\bTuesday\b/i, 2],
  [/\bWednesday\b/i, 3],
  [/\bThursday\b/i, 4],
  [/\bFriday\b/i, 5],
  [/\bSaturday\b/i, 6],
  // Arabic weekdays — optional "يوم " prefix, optional "ال" article
  [/(?:يوم\s+)?(?:ال)?أحد/u, 0],
  [/(?:يوم\s+)?(?:ال)?اثنين/u, 1],
  [/(?:يوم\s+)?(?:ال)?ثلاثاء/u, 2],
  [/(?:يوم\s+)?(?:ال)?أربعاء/u, 3],
  [/(?:يوم\s+)?(?:ال)?خميس/u, 4],
  [/(?:يوم\s+)?(?:ال)?جمعة/u, 5],
  [/(?:يوم\s+)?(?:ال)?سبت/u, 6],
];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Detects labels already carrying a verification/check note (EN or AR)
const ALREADY_MARKED_RE = /—\s*(verify|check|تحقق|راجع)/i;

/**
 * Deterministic post-AI safety layer for date output.
 * Runs after toImportantDateArray() to catch problems that prompt rules alone
 * cannot guarantee:
 *
 *  1. Invalid ISO format          → date nulled
 *  2. Date > 365 days in the past → likely wrong-year inference → date nulled + marker
 *  3. Weekday/calendar mismatch   → date nulled + verify marker
 *  4. urgent=true with null/past date → forced to false
 *
 * @param dates          Output from toImportantDateArray()
 * @param referenceDate  Injected for testing; defaults to today
 */
export function sanitizeImportantDates(
  dates: ImportantDate[],
  referenceDate?: Date,
): ImportantDate[] {
  const today = new Date(referenceDate ?? Date.now());
  today.setHours(0, 0, 0, 0);
  const MS_PER_DAY = 86_400_000;

  return dates.map((item) => {
    let { label, date, urgent } = item;
    const { time, location } = item;

    if (date !== null) {
      // 1. Validate ISO YYYY-MM-DD format
      if (!ISO_DATE_RE.test(date)) {
        date = null;
      } else {
        const parsed = new Date(date + "T00:00:00");
        if (isNaN(parsed.getTime())) {
          date = null;
        } else {
          const daysDiff = (parsed.getTime() - today.getTime()) / MS_PER_DAY;

          // 2. More than 365 days in the past → almost certainly a wrong year
          if (daysDiff < -365) {
            date = null;
            if (!ALREADY_MARKED_RE.test(label)) {
              label = label + " — check original message";
            }
          } else {
            // 3. Weekday/date cross-validation
            // NFC-normalize before matching to handle different Arabic Unicode
            // compositions that LLMs may produce (e.g. hamza variants).
            const actualWeekday = parsed.getDay();
            const normalizedLabel = label.normalize("NFC");
            for (const [pattern, expectedDay] of WEEKDAY_PATTERNS) {
              if (pattern.test(normalizedLabel)) {
                if (actualWeekday !== expectedDay) {
                  date = null;
                  if (!ALREADY_MARKED_RE.test(label)) {
                    label = label + " — verify date in original message";
                  }
                }
                break; // only check first weekday found
              }
            }
          }
        }
      }
    }

    // 4. urgent must be false when date is null or already in the past
    if (date === null) {
      urgent = false;
    } else {
      const parsedForUrgency = new Date(date + "T00:00:00");
      if ((parsedForUrgency.getTime() - today.getTime()) / MS_PER_DAY < 0) {
        urgent = false;
      }
    }

    return { label, date, time, location, urgent };
  });
}

/**
 * Enforces the contract that urgent_action_items must be a strict subset of
 * action_items. Removes any entry not present verbatim in action_items.
 */
function sanitizeUrgentActionItems(
  urgentItems: string[],
  actionItems: string[],
): string[] {
  const actionSet = new Set(actionItems);
  return urgentItems.filter((item) => actionSet.has(item));
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

  const rawActionItems = toStringArray(parsed.action_items);
  const summary: SummaryResult = {
    tldr: String(parsed.tldr ?? ""),
    important_dates: sanitizeImportantDates(toImportantDateArray(parsed.important_dates)),
    action_items: rawActionItems,
    urgent_action_items: sanitizeUrgentActionItems(
      toStringArray(parsed.urgent_action_items),
      rawActionItems,
    ),
    people_classes: toStringArray(parsed.people_classes),
    contacts: toStringArray(parsed.contacts),
    links: toStringArray(parsed.links),
    questions: toStringArray(parsed.questions),
    chat_type: parseChatType(parsed.chat_type),
    chat_context: parseChatContext(parsed.chat_context),
    lang_detected: outputLang === "detect" ? "auto" : outputLang,
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
