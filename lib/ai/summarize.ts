import OpenAI from "openai";

export type LangPref = "auto" | "en" | "ar";

export interface SummaryResult {
  tldr: string;
  important_dates: string[];
  action_items: string[];
  people_classes: string[];
  links: string[];
  questions: string[];
  lang_detected: string;
  char_count: number;
}

type ResolvedLang = Exclude<LangPref, "auto">;

const SYSTEM_PROMPT = `You are Fazumi, an AI assistant that summarizes school WhatsApp group chats for parents.

Analyze the provided chat text and return a JSON object with EXACTLY these six fields (no extra keys):

{
  "tldr": "A 2-3 sentence plain-language summary of the most important points.",
  "important_dates": ["List of specific dates/times/deadlines mentioned, each as a readable string. Include date, time, and location if available. If none, return empty array."],
  "action_items": ["List of things parents or students need to DO. Be specific and actionable. If none, return empty array."],
  "people_classes": ["Names of teachers, people, subjects, or class sections mentioned. If none, return empty array."],
  "links": ["URLs, file references, or attachments mentioned in the chat. If none, return empty array."],
  "questions": ["Questions a parent should ask the teacher or school to clarify anything important. If none, return empty array."]
}

RULES:
- Use absolute dates (e.g. "Monday Feb 24" not "tomorrow" or "next week").
- Be concise. Bullet points, not paragraphs, for list fields.
- Follow the output language requested in the user message. If no output language is requested, reply in the SAME language as the chat.
- Never include raw message text in your output.
- If the chat is too short or unclear to summarize, set tldr to a brief note explaining that, and return empty arrays for all list fields.

Return ONLY valid JSON. No markdown code blocks. No explanation outside the JSON.`;

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

function detectInputLanguage(text: string): ResolvedLang {
  const arabicChars = text.match(/[\u0600-\u06FF]/g)?.length ?? 0;
  const latinChars = text.match(/[A-Za-z]/g)?.length ?? 0;

  if (arabicChars === 0) return "en";
  if (latinChars === 0) return "ar";
  return arabicChars >= latinChars ? "ar" : "en";
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

export async function summarizeChat(
  text: string,
  langPref: LangPref = "auto"
): Promise<SummaryResult> {
  const openai = getOpenAI();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o";
  const outputLang = resolveOutputLanguage(text, langPref);

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: 1200,
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

  const tldr = String(parsed.tldr ?? "");

  return {
    tldr,
    important_dates: toStringArray(parsed.important_dates),
    action_items: toStringArray(parsed.action_items),
    people_classes: toStringArray(parsed.people_classes),
    links: toStringArray(parsed.links),
    questions: toStringArray(parsed.questions),
    lang_detected: outputLang,
    char_count: text.length,
  };
}

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map((v) => String(v)).filter(Boolean);
}
