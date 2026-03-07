import OpenAI from "openai";
import { estimateAiCostUsd, estimateTokenCount } from "@/lib/ai/usage";

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

const SYSTEM_PROMPT = `You are Fazumi, an AI assistant that summarizes school WhatsApp group chats for parents.

Analyze the provided chat text and return a JSON object with EXACTLY these fields (no extra keys):

{
  "tldr": "A 2-3 sentence plain-language summary of the most important points.",
  "important_dates": [
    {
      "label": "Human-readable description e.g. 'Parent meeting at school hall'",
      "date": "ISO date YYYY-MM-DD if determinable, else null",
      "time": "24h time HH:MM if mentioned, else null",
      "location": "Location if mentioned, else null",
      "urgent": true if the event is today or tomorrow relative to the most recent message, otherwise false
    }
  ],
  "action_items": ["All things parents or students need to DO. Be specific and actionable. If none, return empty array."],
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
- contacts: only explicitly stated phone numbers, emails, or contact handles — never invent.
- chat_type values: "routine_update" = regular school news; "urgent_notice" = requires immediate action; "event_announcement" = specific upcoming event; "noisy_general_chat" = mostly off-topic chatter with little actionable content.
- Be concise. Bullet points, not paragraphs, for list fields.
- Follow the output language requested in the user message. If no output language is requested, reply in the SAME language as the chat.
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

function buildUserMessage(text: string, outputLang: ResolvedLang): string {
  const langInstruction =
    outputLang === "en"
      ? "\n\nIMPORTANT: Reply in English only, regardless of the chat language."
      : "\n\nIMPORTANT: Reply in Standard Arabic (فصحى) only, regardless of the chat language.";

  return `Here is the WhatsApp chat to summarize:

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
    };
  }
  return { message_count_estimate: null, date_range: null };
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
  langPref: LangPref = "auto"
): Promise<{
  summary: SummaryResult;
  usage: SummaryUsage;
}> {
  const openai = getOpenAI();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const outputLang = resolveOutputLanguage(text, langPref);

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(text, outputLang) },
    ],
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
    completion.usage?.prompt_tokens ?? estimateTokenCount(buildUserMessage(text, outputLang));
  const completionTokens =
    completion.usage?.completion_tokens ?? estimateTokenCount(raw);

  return {
    summary,
    usage: buildUsage(model, promptTokens, completionTokens),
  };
}
