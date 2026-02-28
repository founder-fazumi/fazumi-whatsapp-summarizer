import { type NextRequest, NextResponse } from "next/server";
import { summarizeChat, type LangPref, type SummaryResult } from "@/lib/ai/summarize";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { formatNumber } from "@/lib/format";
import type { Profile, UsageDaily } from "@/lib/supabase/types";

// Limits per plan
const LIMITS: Record<string, number> = {
  monthly: 50,
  annual: 50,
  founder: 50,
  trial: 50,   // active trial: generous daily limit
  free: 0,     // expired free: 0/day (lifetime cap handled separately)
};
const FREE_LIFETIME_CAP = 3;

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

function makeTitle(tldr: string): string {
  const first = tldr.split(/[.\n]/)[0]?.trim() ?? tldr;
  return first.length > 60 ? first.slice(0, 57) + "…" : first;
}

async function saveSummary(userId: string, summary: SummaryResult, charCount: number): Promise<string | null> {
  try {
    const adminUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!adminUrl || !adminKey) return null;

    const admin = createAdminClient(adminUrl, adminKey);
    const { data, error } = await admin.from("summaries").insert({
      user_id: userId,
      title: makeTitle(summary.tldr),
      tldr: summary.tldr,
      important_dates: summary.important_dates,
      action_items: summary.action_items,
      people_classes: summary.people_classes,
      links: summary.links,
      questions: summary.questions,
      char_count: charCount,
      lang_detected: summary.lang_detected ?? "en",
    }).select("id").single<{ id: string }>();

    if (error) return null;
    return data?.id ?? null;
  } catch {
    return null;
  }
}

async function incrementUsage(userId: string): Promise<void> {
  try {
    const adminUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!adminUrl || !adminKey) return;

    const admin = createAdminClient(adminUrl, adminKey);
    const today = new Date().toISOString().slice(0, 10);

    // Read current count then write incremented value (MVP simplification — not perfectly atomic)
    const { data: existing } = await admin
      .from("usage_daily")
      .select("summaries_used")
      .eq("user_id", userId)
      .eq("date", today)
      .single<Pick<UsageDaily, "summaries_used">>();

    const newCount = (existing?.summaries_used ?? 0) + 1;

    await admin.from("usage_daily").upsert(
      { user_id: userId, date: today, summaries_used: newCount },
      { onConflict: "user_id,date" }
    );
  } catch {
    // Non-fatal — usage tracking failure must not fail the user's request
  }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  // ── Auth + plan limit check (authenticated users) ──────────────────────
  let authedUserId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      authedUserId = user.id;

      // Fetch profile + today's usage
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: profile }, { data: usage }] = await Promise.all([
        supabase
          .from("profiles")
          .select("plan, trial_expires_at, lifetime_free_used")
          .eq("id", user.id)
          .single<Pick<Profile, "plan" | "trial_expires_at" | "lifetime_free_used">>(),
        supabase
          .from("usage_daily")
          .select("summaries_used")
          .eq("user_id", user.id)
          .eq("date", today)
          .single<Pick<UsageDaily, "summaries_used">>(),
      ]);

      const plan = profile?.plan ?? "free";
      const trialExpires = profile?.trial_expires_at;
      const lifetimeFreeUsed = profile?.lifetime_free_used ?? 0;
      const usedToday = usage?.summaries_used ?? 0;
      const isTrialActive = !!trialExpires && new Date(trialExpires) > new Date();
      const isPaid = ["monthly", "annual", "founder"].includes(plan);

      // Determine tier key for daily limit
      const tierKey = isPaid ? plan : isTrialActive ? "trial" : "free";
      const dailyLimit = LIMITS[tierKey] ?? 0;

      if (!isPaid && !isTrialActive) {
        // Post-trial free: enforce lifetime cap
        if (lifetimeFreeUsed >= FREE_LIFETIME_CAP) {
          return NextResponse.json(
            { error: "limit_reached", code: "LIFETIME_CAP" },
            { status: 402 }
          );
        }
      } else if (usedToday >= dailyLimit) {
        return NextResponse.json(
          { error: "limit_reached", code: "DAILY_CAP" },
          { status: 402 }
        );
      }
    }
  } catch {
    // Supabase not configured — fall through to anonymous IP rate limit
  }

  // ── Anonymous IP rate limit ─────────────────────────────────────────────
  if (!authedUserId) {
    const ip = getClientIp(req);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }
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
        error: `Text is too long. Maximum is ${formatNumber(MAX_CHARS)} characters. You provided ${formatNumber(text.length)}.`,
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

    // ── Save + increment AFTER successful response (never charge on failure) ──
    let savedId: string | null = null;
    if (authedUserId) {
      [savedId] = await Promise.all([
        saveSummary(authedUserId, summary, text.length),
        incrementUsage(authedUserId),
      ]);
    }

    return NextResponse.json({ summary, savedId });
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
