import { type NextRequest, NextResponse } from "next/server";
import { summarizeChat } from "@/lib/ai/summarize";

export const runtime = "nodejs";

// In-process rate limit: 1 demo per IP per 2 minutes (resets on cold start)
const ipLastRequest = new Map<string, number>();
const RATE_LIMIT_MS = 2 * 60 * 1000;
const MAX_DEMO_CHARS = 500;

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const now = Date.now();
  const last = ipLastRequest.get(ip) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    const retryAfterSeconds = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000);
    return NextResponse.json(
      { error: "Please wait a moment before trying the demo again." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  let body: { text?: unknown; lang_pref?: unknown };
  try {
    body = (await req.json()) as { text?: unknown; lang_pref?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 20) {
    return NextResponse.json(
      { error: "Paste at least 20 characters to generate a demo summary." },
      { status: 400 }
    );
  }
  if (text.length > MAX_DEMO_CHARS) {
    return NextResponse.json(
      { error: `Demo limit is ${MAX_DEMO_CHARS} characters.` },
      { status: 400 }
    );
  }

  const validLangPrefs = new Set(["auto", "en", "ar"]);
  const langPref =
    typeof body.lang_pref === "string" && validLangPrefs.has(body.lang_pref)
      ? (body.lang_pref as "auto" | "en" | "ar")
      : "auto";

  // Record the request time before the AI call so slow responses still count
  ipLastRequest.set(ip, now);

  try {
    const { summary } = await summarizeChat(text, langPref);

    // Return only the fields the Hero component needs — never echo raw text
    return NextResponse.json({
      tldr: summary.tldr,
      actionItems: summary.action_items,
      importantDates: summary.important_dates,
      followUpQuestions: summary.questions,
      helpfulLinks: summary.links,
    });
  } catch (err) {
    // Release the rate limit slot so a transient failure doesn't lock the user out
    ipLastRequest.delete(ip);
    console.error(
      JSON.stringify({
        source: "api/demo/summarize",
        error: String(err),
        ts: new Date().toISOString(),
      })
    );
    return NextResponse.json(
      { error: "Could not generate a demo summary. Please try again." },
      { status: 500 }
    );
  }
}
