import { type NextRequest, NextResponse } from "next/server";
import { summarizeChat, type LangPref, type SummaryResult, type SummaryUsage, type SummaryPromptContext } from "@/lib/ai/summarize";
import { estimateTokenCount } from "@/lib/ai/usage";
import { ensureChatGroup } from "@/lib/chat-groups";
import type { ImportSourcePlatform } from "@/lib/chat-import/source-detect";
import { normalizeFamilyContext, normalizeSummaryRetentionDays } from "@/lib/family-context";
import { applySummaryRetentionPolicy } from "@/lib/server/retention";
import { logAiRequest, PersistError, saveSummaryRecord } from "@/lib/server/summaries";
import { captureRouteException } from "@/lib/sentry";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { formatNumber } from "@/lib/format";
import {
  FREE_LIFETIME_CAP,
  getDailyLimit,
  getUtcDateKey,
  resolveEntitlement,
  type EntitlementSubscription,
} from "@/lib/limits";
import { sendPushToUser } from "@/lib/push/server";

import { createRouteLogger, getRequestId } from "@/lib/logger";

const MAX_CHARS = 30_000;
export const runtime = "nodejs";

function makeTitle(tldr: string): string {
  const first = tldr.split(/[.\n]/)[0]?.trim() ?? tldr;
  return first.length > 60 ? first.slice(0, 57) + "…" : first;
}

function hasSupabaseAuthCookie(req: NextRequest) {
  return req.cookies.getAll().some(({ name }) =>
    name === "supabase-auth-token" ||
    name.startsWith("supabase-auth-token.") ||
    (name.startsWith("sb-") && name.includes("-auth-token"))
  );
}

function buildSummaryReadyPayload(summary: SummaryResult, savedId: string) {
  const urgentItem =
    summary.urgent_action_items[0] ??
    summary.important_dates.find((item) => item.urgent)?.label ??
    summary.tldr;
  const isArabic = summary.lang_detected === "ar";
  const isUrgent =
    summary.chat_type === "urgent_notice" ||
    summary.urgent_action_items.length > 0 ||
    summary.important_dates.some((item) => item.urgent);

  return {
    title: isUrgent
      ? isArabic
        ? "تنبيه مدرسي عاجل"
        : "Urgent school update"
      : isArabic
        ? "ملخص فازومي جاهز"
        : "Summary ready",
    body: makeTitle(isUrgent ? urgentItem : summary.tldr),
    url: `/history/${savedId}`,
    id: `summary-ready-${savedId}`,
  };
}

function isRetryableUsageRpcError(error: {
  code?: string | null;
  message?: string | null;
}) {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  return (
    code === "23505" ||
    code === "40001" ||
    code === "40P01" ||
    message.includes("duplicate key") ||
    message.includes("could not serialize") ||
    message.includes("deadlock")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type UsageReservation =
  | {
    kind: "daily";
    userId: string;
    dateKey: string;
  }
  | {
    kind: "lifetime_free";
    userId: string;
  };

function getAdminClient() {
  const adminUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!adminUrl || !adminKey) {
    return null;
  }

  return createAdminClient(adminUrl, adminKey);
}

async function incrementUsageDailyAtomic(
  userId: string,
  dateKey: string,
  increment = 1
): Promise<number> {
  const admin = getAdminClient();
  if (!admin) {
    throw new PersistError("Summary storage is not configured.", "PERSIST_NOT_CONFIGURED");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await admin.rpc("increment_usage_daily_atomic", {
      p_user_id: userId,
      p_date: dateKey,
      p_increment: increment,
    });

    if (!error && typeof data === "number") {
      return data;
    }

    if (!error || !isRetryableUsageRpcError(error) || attempt === 2) {
      throw new PersistError("Could not update daily usage.", "USAGE_WRITE_FAILED");
    }

    await sleep(25 * (attempt + 1));
  }

  throw new PersistError("Could not update daily usage.", "USAGE_WRITE_FAILED");
}

async function seedTodosFromSummary(userId: string, actionItems: string[]): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return; // Non-critical: best-effort, don't fail the request

  const rows = actionItems
    .map((label, index) => ({ label: label.trim(), sort_order: index }))
    .filter(({ label }) => label.length > 0)
    .map(({ label, sort_order }) => ({
      user_id: userId,
      label,
      source: "summary" as const,
      sort_order,
      done: false,
    }));

  if (rows.length === 0) return;

  try {
    await admin.from("user_todos").insert(rows);
  } catch {
    return;
  }
}

async function incrementLifetimeFreeUsageAtomic(
  userId: string,
  increment = 1
): Promise<number> {
  const admin = getAdminClient();
  if (!admin) {
    throw new PersistError("Summary storage is not configured.", "PERSIST_NOT_CONFIGURED");
  }

  const { data, error } = await admin.rpc("increment_lifetime_free_atomic", {
    p_user_id: userId,
    p_increment: increment,
  });

  if (error || typeof data !== "number") {
    throw new PersistError("Could not update lifetime usage.", "LIFETIME_USAGE_WRITE_FAILED");
  }

  return data;
}

async function reserveUsageQuota(params: {
  userId: string;
  tierKey: string;
  dateKey: string;
}): Promise<
  | {
    ok: true;
    count: number;
    reservation: UsageReservation;
  }
  | {
    ok: false;
    code: "DAILY_CAP" | "LIFETIME_CAP";
  }
> {
  if (params.tierKey === "free") {
    const lifetimeFreeUsed = await incrementLifetimeFreeUsageAtomic(params.userId, 1);

    if (lifetimeFreeUsed > FREE_LIFETIME_CAP) {
      await incrementLifetimeFreeUsageAtomic(params.userId, -1);
      return { ok: false, code: "LIFETIME_CAP" };
    }

    return {
      ok: true,
      count: lifetimeFreeUsed,
      reservation: {
        kind: "lifetime_free",
        userId: params.userId,
      },
    };
  }

  const dailyUsed = await incrementUsageDailyAtomic(params.userId, params.dateKey, 1);
  const dailyLimit = getDailyLimit(params.tierKey);

  if (dailyUsed > dailyLimit) {
    await incrementUsageDailyAtomic(params.userId, params.dateKey, -1);
    return { ok: false, code: "DAILY_CAP" };
  }

  return {
    ok: true,
    count: dailyUsed,
    reservation: {
      kind: "daily",
      userId: params.userId,
      dateKey: params.dateKey,
    },
  };
}

async function releaseUsageQuota(reservation: UsageReservation): Promise<void> {
  if (reservation.kind === "daily") {
    await incrementUsageDailyAtomic(reservation.userId, reservation.dateKey, -1);
    return;
  }

  await incrementLifetimeFreeUsageAtomic(reservation.userId, -1);
}

export async function POST(req: NextRequest) {
  const route = "/api/summarize";
  const requestId = getRequestId(req.headers);
  const logger = createRouteLogger({ route, requestId });
  const requestStartedAt = Date.now();
  logger.info("request.start");

  // ── Auth + plan limit check (authenticated users) ──────────────────────
  let authedUserId: string | null = null;
  let tierKey = "free";
  let usageDateKey: string | null = null;
  let charCount = 0;
  let openAiDurationMs: number | null = null;
  let openAiStartedAt: number | null = null;
  let aiUsage: SummaryUsage | null = null;
  let savedId: string | null = null;
  let usageReservation: UsageReservation | null = null;
  let summaryRetentionDays: number | null = null;
  let promptContext: SummaryPromptContext | undefined;

  if (!hasSupabaseAuthCookie(req)) {
    logger.warn("auth.required", { errorCode: "AUTH_REQUIRED" });
    return NextResponse.json(
      {
        error: "You must be signed in to summarize chats.",
        code: "AUTH_REQUIRED",
      },
      { status: 401 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      logger.warn("auth.required", { errorCode: "AUTH_REQUIRED" });
      return NextResponse.json(
        {
          error: "You must be signed in to summarize chats.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    authedUserId = user.id;

    usageDateKey = getUtcDateKey();
    const [{ data: profile }, { data: subscriptions }] = await Promise.all([
      supabase
        .from("profiles")
        .select("plan, trial_expires_at, family_context, summary_retention_days")
        .eq("id", user.id)
        .maybeSingle<{
          plan: string | null;
          trial_expires_at: string | null;
          family_context: unknown;
          summary_retention_days: number | null;
        }>(),
      supabase
        .from("subscriptions")
        .select("plan_type, status, current_period_end, updated_at, created_at")
        .eq("user_id", user.id),
    ]);

    const entitlement = resolveEntitlement({
      profile: {
        plan: profile?.plan ?? "free",
        trial_expires_at: profile?.trial_expires_at ?? null,
      },
      subscriptions: (subscriptions ?? []) as EntitlementSubscription[],
    });
    const familyContext = normalizeFamilyContext(profile?.family_context);

    tierKey = entitlement.tierKey;
    summaryRetentionDays = normalizeSummaryRetentionDays(profile?.summary_retention_days);
    promptContext = {
      familyContext,
    };  } catch (error) {
    logger.error("auth.lookup_failed", {
      errorCode: "AUTH_LOOKUP_FAILED",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: "Authentication is unavailable. Please try again later.",
        code: "AUTH_LOOKUP_FAILED",
      },
      { status: 503 }
    );
  }

  let body: {
    text?: string;
    lang_pref?: string;
    source_platform?: string;
    group_name?: string;
  };
  try {
    body = (await req.json()) as { text?: string; lang_pref?: string };
  } catch {
    logger.warn("request.rejected", { errorCode: "INVALID_JSON" });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  charCount = text.length;
  if (!text) {
    logger.warn("request.rejected", { userId: authedUserId, errorCode: "EMPTY_TEXT" });
    return NextResponse.json(
      { error: "Please provide some chat text to summarize." },
      { status: 400 }
    );
  }
  if (text.length > MAX_CHARS) {
    logger.warn("request.rejected", {
      userId: authedUserId,
      charCount,
      errorCode: "TEXT_TOO_LONG",
    });
    return NextResponse.json(
      {
        error: `Text is too long. Maximum is ${formatNumber(MAX_CHARS)} characters. You provided ${formatNumber(text.length)}.`,
      },
      { status: 400 }
    );
  }
  if (text.length < 20) {
    logger.warn("request.rejected", {
      userId: authedUserId,
      charCount,
      errorCode: "TEXT_TOO_SHORT",
    });
    return NextResponse.json(
      { error: "Text is too short to summarize. Please paste more content." },
      { status: 400 }
    );
  }

  const validLangPrefs = ["auto", "en", "ar"];
  const langPref: LangPref = validLangPrefs.includes(body.lang_pref ?? "")
    ? (body.lang_pref as LangPref)
    : "auto";
  const sourcePlatform: ImportSourcePlatform | null =
    body.source_platform === "whatsapp" ||
    body.source_platform === "telegram" ||
    body.source_platform === "facebook"
      ? body.source_platform
      : null;
  const groupName =
    typeof body.group_name === "string" && body.group_name.trim().length > 0
      ? body.group_name.trim().slice(0, 120)
      : null;
  promptContext = {
    ...promptContext,
    sourcePlatform,
    groupTitle: groupName,
  };

  try {
    const reservation = await reserveUsageQuota({
      userId: authedUserId,
      tierKey,
      dateKey: usageDateKey ?? getUtcDateKey(),
    });

    if (!reservation.ok) {
      logger.warn("limit.hit", {
        userId: authedUserId,
        errorCode: reservation.code,
        dateKey: usageDateKey ?? getUtcDateKey(),
        tierKey,
        limit:
          reservation.code === "DAILY_CAP"
            ? getDailyLimit(tierKey)
            : FREE_LIFETIME_CAP,
      });
      return NextResponse.json(
        { error: "limit_reached", code: reservation.code },
        { status: 402 }
      );
    }

    usageReservation = reservation.reservation;
    logger.info("db.usage_reserved", {
      userId: authedUserId,
      reservationKind: usageReservation.kind,
      dateKey: usageReservation.kind === "daily" ? usageReservation.dateKey : undefined,
      tierKey,
      used: reservation.count,
    });

    logger.info("openai.start", {
      userId: authedUserId,
      charCount,
      langPref,
    });
    openAiStartedAt = Date.now();
    const result = await summarizeChat(text, langPref, promptContext);
    const summary = result.summary;
    aiUsage = result.usage;
    openAiDurationMs = Date.now() - openAiStartedAt;
    logger.info("openai.success", {
      userId: authedUserId,
      charCount,
      langPref,
      langDetected: summary.lang_detected ?? "en",
      model: aiUsage.model,
      promptTokens: aiUsage.promptTokens,
      completionTokens: aiUsage.completionTokens,
      totalTokens: aiUsage.totalTokens,
      estimatedCostUsd: aiUsage.estimatedCostUsd,
      openAiDurationMs,
    });
    await logAiRequest({
      route,
      userId: authedUserId,
      model: aiUsage.model,
      status: "success",
      inputChars: charCount,
      promptTokens: aiUsage.promptTokens,
      completionTokens: aiUsage.completionTokens,
      totalTokens: aiUsage.totalTokens,
      estimatedCostUsd: aiUsage.estimatedCostUsd,
      latencyMs: openAiDurationMs,
      errorCode: null,
    });

    if (authedUserId) {
      let groupId: string | null = null;
      const admin = getAdminClient();

      if (admin && groupName) {
        try {
          const group = await ensureChatGroup(admin, authedUserId, groupName);
          groupId = group.id;
        } catch (groupError) {
          logger.warn("db.group_save_failed", {
            userId: authedUserId,
            groupName,
            error: groupError instanceof Error ? groupError.message : String(groupError),
          });
        }
      }

      savedId = await saveSummaryRecord({
        userId: authedUserId,
        summary,
        charCount,
        groupId,
        groupName,
        sourceKind: "text",
      });
      logger.info("db.summary_saved", {
        userId: authedUserId,
        summaryId: savedId,
        charCount,
      });

      if (admin) {
        try {
          const retained = await applySummaryRetentionPolicy(
            admin,
            authedUserId,
            summaryRetentionDays
          );
          if (retained > 0) {
            logger.info("db.retention_applied", {
              userId: authedUserId,
              retained,
              summaryRetentionDays,
            });
          }
        } catch (retentionError) {
          logger.warn("db.retention_failed", {
            userId: authedUserId,
            error: retentionError instanceof Error ? retentionError.message : String(retentionError),
          });
        }
      }

      // Seed action items into user_todos (best-effort, non-blocking)
      if (summary.action_items && summary.action_items.length > 0) {
        await seedTodosFromSummary(authedUserId, summary.action_items);
        logger.info("db.todos_seeded", {
          userId: authedUserId,
          summaryId: savedId,
          count: summary.action_items.length,
        });
      }

      if (savedId) {
        try {
          await sendPushToUser(
            authedUserId,
            buildSummaryReadyPayload(summary, savedId)
          );
          logger.info("push.summary_ready_sent", {
            userId: authedUserId,
            summaryId: savedId,
          });
        } catch (pushError) {
          logger.warn("push.summary_ready_failed", {
            userId: authedUserId,
            summaryId: savedId,
            error: pushError instanceof Error ? pushError.message : String(pushError),
          });
        }
      }
    }

    logger.info("request.success", {
      userId: authedUserId,
      summaryId: savedId,
      charCount,
      openAiDurationMs,
      durationMs: Date.now() - requestStartedAt,
    });
    return NextResponse.json({ summary, savedId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    const errorCode =
      err instanceof PersistError ? err.code :
      message.includes("OPENAI_API_KEY") ? "OPENAI_NOT_CONFIGURED" :
      "SUMMARY_FAILED";
    const statusCode = message.includes("OPENAI_API_KEY") ? 503 : 500;
    const failedOpenAiLatencyMs =
      openAiStartedAt !== null ? Date.now() - openAiStartedAt : 0;
    const loggedOpenAiDurationMs =
      openAiDurationMs ?? (failedOpenAiLatencyMs > 0 ? failedOpenAiLatencyMs : undefined);

    if (!(err instanceof PersistError) && openAiStartedAt !== null && !aiUsage) {
      await logAiRequest({
        route,
        userId: authedUserId,
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        status: "error",
        inputChars: charCount,
        promptTokens: estimateTokenCount(text),
        completionTokens: 0,
        totalTokens: estimateTokenCount(text),
        estimatedCostUsd: 0,
        latencyMs: failedOpenAiLatencyMs,
        errorCode,
      });
    }

    if (usageReservation && !aiUsage) {
      try {
        await releaseUsageQuota(usageReservation);
        logger.info("db.usage_released", {
          userId: authedUserId,
          reservationKind: usageReservation.kind,
          dateKey: usageReservation.kind === "daily" ? usageReservation.dateKey : undefined,
          errorCode,
        });
      } catch (releaseError) {
        logger.error("db.usage_release_failed", {
          userId: authedUserId,
          reservationKind: usageReservation.kind,
          dateKey: usageReservation.kind === "daily" ? usageReservation.dateKey : undefined,
          errorCode,
          releaseError: releaseError instanceof Error ? releaseError.message : String(releaseError),
        });
      }
    }

    logger.error("request.failed", {
      userId: authedUserId,
      summaryId: savedId,
      charCount: charCount || undefined,
      openAiDurationMs: loggedOpenAiDurationMs,
      durationMs: Date.now() - requestStartedAt,
      errorCode,
      error: message,
    });
    await captureRouteException(err, {
      route,
      requestId,
      userId: authedUserId,
      summaryId: savedId,
      errorCode,
      statusCode,
      charCount: charCount || undefined,
      openAiDurationMs: openAiDurationMs ?? undefined,
    });

    if (err instanceof PersistError) {
      return NextResponse.json({ error: message }, { status: 500 });
    }

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


