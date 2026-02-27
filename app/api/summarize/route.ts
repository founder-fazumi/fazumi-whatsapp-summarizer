import { type NextRequest, NextResponse } from "next/server";
import { summarizeChat, type LangPref } from "@/lib/ai/summarize";

const MAX_CHARS = 30_000;

// Simple in-memory rate limiter: max 5 requests per IP per minute
const ipRequestMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequestMap.get(ip);

  if (!entry || now > entry.resetAt) {
    ipRequestMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body: { text?: string; lang_pref?: string };
  try {
    body = (await req.json()) as { text?: string; lang_pref?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json(
      { error: "Please provide some chat text to summarize." },
      { status: 400 }
    );
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      {
        error: `Text is too long. Maximum is ${MAX_CHARS.toLocaleString()} characters. You provided ${text.length.toLocaleString()}.`,
      },
      { status: 400 }
    );
  }
  if (text.length < 20) {
    return NextResponse.json(
      { error: "Text is too short to summarize. Please paste more content." },
      { status: 400 }
    );
  }

  const validLangPrefs = ["auto", "en", "ar"];
  const langPref: LangPref = validLangPrefs.includes(body.lang_pref ?? "")
    ? (body.lang_pref as LangPref)
    : "auto";

  try {
    const summary = await summarizeChat(text, langPref);
    return NextResponse.json({ summary });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("[/api/summarize] Error:", message);

    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        { error: "AI service is not configured. Please add your OPENAI_API_KEY." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate summary. Please try again." },
      { status: 500 }
    );
  }
}
