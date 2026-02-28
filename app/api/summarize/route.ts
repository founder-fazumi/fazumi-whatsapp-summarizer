import { type NextRequest, NextResponse } from "next/server";
import { summarizeChat, type LangPref, type SummaryResult } from "@/lib/ai/summarize";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { formatNumber } from "@/lib/format";
import { FREE_LIFETIME_CAP, getDailyLimit, getTierKey, getUtcDateKey } from "@/lib/limits";
import type { Profile, UsageDaily } from "@/lib/supabase/types";

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

class PersistError extends Error {}

function getAdminClient() {
  const adminUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!adminUrl || !adminKey) {
    return null;
  }

  return createAdminClient(adminUrl, adminKey);
}

function logLimitDebug(code: "DAILY_CAP" | "LIFETIME_CAP", details: Record<string, string | number>) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[/api/summarize] limit", { code, ...details });
  }
}

async function saveSummary(userId: string, summary: SummaryResult, charCount: number): Promise<string> {
  const admin = getAdminClient();
  if (!admin) {
    throw new PersistError("Summary storage is not configured.");
  }

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

  if (error || !data?.id) {
    throw new PersistError("Could not save summary.");
  }

  return data.id;
}

async function incrementUsage(userId: string, dateKey: string): Promise<void> {
  const admin = getAdminClient();
  if (!admin) {
    throw new PersistError("Summary storage is not configured.");
  }

  const { data: existing, error: readError } = await admin
    .from("usage_daily")
    .select("summaries_used")
    .eq("user_id", userId)
    .eq("date", dateKey)
    .maybeSingle<Pick<UsageDaily, "summaries_used">>();

  if (readError) {
    throw new PersistError("Could not read daily usage.");
  }

  const newCount = (existing?.summaries_used ?? 0) + 1;

  const { error: writeError } = await admin.from("usage_daily").upsert(
    { user_id: userId, date: dateKey, summaries_used: newCount },
    { onConflict: "user_id,date" }
  );

  if (writeError) {
    throw new PersistError("Could not update daily usage.");
  }
}

async function incrementLifetimeFreeUsage(userId: string, lifetimeFreeUsed: number): Promise<void> {
  const admin = getAdminClient();
  if (!admin) {
    throw new PersistError("Summary storage is not configured.");
  }

  const { error } = await admin
    .from("profiles")
    .update({ lifetime_free_used: lifetimeFreeUsed + 1 })
    .eq("id", userId);

  if (error) {
    throw new PersistError("Could not update lifetime usage.");
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
  let tierKey = "free";
  let lifetimeFreeUsed = 0;
  let shouldIncrementLifetimeFree = false;
  let usageDateKey: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      authedUserId = user.id;

      // Fetch profile + today's usage
      const today = getUtcDateKey();
      usageDateKey = today;
      const [{ data: profile }, { data: usage }] = await Promise.all([
        supabase
          .from("profiles")
          .select("plan, trial_expires_at, lifetime_free_used")
          .eq("id", user.id)
          .maybeSingle<Pick<Profile, "plan" | "trial_expires_at" | "lifetime_free_used">>(),
        supabase
          .from("usage_daily")
          .select("summaries_used")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle<Pick<UsageDaily, "summaries_used">>(),
      ]);

      const plan = profile?.plan ?? "free";
      const trialExpires = profile?.trial_expires_at;
      lifetimeFreeUsed = profile?.lifetime_free_used ?? 0;
      const usedToday = usage?.summaries_used ?? 0;

      tierKey = getTierKey(plan, trialExpires);
      shouldIncrementLifetimeFree = tierKey === "free";
      const dailyLimit = getDailyLimit(tierKey);

      if (tierKey === "free") {
        // Post-trial free: enforce lifetime cap
        if (lifetimeFreeUsed >= FREE_LIFETIME_CAP) {
          logLimitDebug("LIFETIME_CAP", {
            userId: user.id,
            dateKey: today,
            lifetimeFreeUsed,
          });
          return NextResponse.json(
            { error: "limit_reached", code: "LIFETIME_CAP" },
            { status: 402 }
          );
        }
      } else if (usedToday >= dailyLimit) {
        logLimitDebug("DAILY_CAP", {
          userId: user.id,
          dateKey: today,
          tierKey,
          usedToday,
          dailyLimit,
        });
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

    let savedId: string | null = null;
    if (authedUserId) {
      savedId = await saveSummary(authedUserId, summary, text.length);
      await incrementUsage(authedUserId, usageDateKey ?? getUtcDateKey());
      if (shouldIncrementLifetimeFree) {
        await incrementLifetimeFreeUsage(authedUserId, lifetimeFreeUsed);
      }
    }

    return NextResponse.json({ summary, savedId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";

    if (err instanceof PersistError) {
      console.error("[/api/summarize] Persist error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

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
