import { type NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { SummaryResult } from "@/lib/ai/summarize";
import { FREE_LIFETIME_CAP, getDailyLimit, getTierKey, getUtcDateKey } from "@/lib/limits";
import { isSupabaseAuthCookieName } from "@/lib/supabase/auth-cookies";

export const MAX_SUMMARY_CHARS = 30_000;

let aiRequestLogsUnavailable = false;
let aiRequestLogsWarningShown = false;
const OPTIONAL_SUMMARY_INSERT_COLUMNS = [
  "urgent_action_items",
  "contacts",
  "chat_type",
  "chat_context",
  "group_name",
  "group_id",
  "source_kind",
  "source_range",
  "new_messages_count",
] as const;

type OptionalSummaryInsertColumn = (typeof OPTIONAL_SUMMARY_INSERT_COLUMNS)[number];

export class PersistError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "PersistError";
  }
}

export type UsageReservation =
  | {
    kind: "daily";
    userId: string;
    dateKey: string;
  }
  | {
    kind: "lifetime_free";
    userId: string;
  };

export type SummarySourceKind = "text" | "zip";
export type SummarySourceRange = "24h" | "7d";

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

function isAiRequestLogsMissingError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("ai_request_logs") &&
    (
      normalized.includes("schema cache") ||
      normalized.includes("relation") ||
      normalized.includes("does not exist") ||
      normalized.includes("could not find the table")
    )
  );
}

function shouldSuppressAiRequestLogWarnings() {
  return process.env.NODE_ENV !== "production" || process.env.PLAYWRIGHT_TEST === "1";
}

function getMissingSummaryInsertColumn(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}): OptionalSummaryInsertColumn | null {
  const code = error.code ?? "";
  const message = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();

  const looksLikeMissingColumn =
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("schema cache") ||
    message.includes("column") ||
    message.includes("does not exist") ||
    message.includes("could not find");

  if (!looksLikeMissingColumn) {
    return null;
  }

  return OPTIONAL_SUMMARY_INSERT_COLUMNS.find((column) => message.includes(column)) ?? null;
}

function getSummaryInsertPayload(params: {
  userId: string;
  summary: SummaryResult;
  charCount: number;
  groupId?: string | null;
  groupName?: string | null;
  sourceKind?: SummarySourceKind;
  sourceRange?: SummarySourceRange | null;
  newMessagesCount?: number | null;
}, options?: {
  omittedColumns?: ReadonlySet<OptionalSummaryInsertColumn>;
}) {
  const omittedColumns = options?.omittedColumns;
  const shouldInclude = (column: OptionalSummaryInsertColumn) => !omittedColumns?.has(column);

  return {
    user_id: params.userId,
    title: makeSummaryTitle(params.summary.tldr),
    tldr: params.summary.tldr,
    important_dates: params.summary.important_dates,
    action_items: params.summary.action_items,
    ...(shouldInclude("urgent_action_items")
      ? { urgent_action_items: params.summary.urgent_action_items }
      : {}),
    people_classes: params.summary.people_classes,
    ...(shouldInclude("contacts") ? { contacts: params.summary.contacts } : {}),
    links: params.summary.links,
    questions: params.summary.questions,
    ...(shouldInclude("chat_type") ? { chat_type: params.summary.chat_type } : {}),
    ...(shouldInclude("chat_context") ? { chat_context: params.summary.chat_context } : {}),
    char_count: params.charCount,
    lang_detected: params.summary.lang_detected ?? "en",
    ...(shouldInclude("group_name") ? { group_name: params.groupName ?? null } : {}),
    ...(shouldInclude("group_id") && params.groupId ? { group_id: params.groupId } : {}),
    ...(shouldInclude("source_kind") && params.sourceKind ? { source_kind: params.sourceKind } : {}),
    ...(shouldInclude("source_range") && params.sourceRange ? { source_range: params.sourceRange } : {}),
    ...(shouldInclude("new_messages_count") && typeof params.newMessagesCount === "number"
      ? { new_messages_count: params.newMessagesCount }
      : {}),
  };
}

export function makeSummaryTitle(tldr: string): string {
  const first = tldr.split(/[.\n]/)[0]?.trim() ?? tldr;
  return first.length > 60 ? first.slice(0, 57) + "…" : first;
}

export function hasSupabaseAuthCookie(req: NextRequest) {
  return req.cookies.getAll().some(({ name }) => isSupabaseAuthCookieName(name));
}

export function getAdminClient() {
  const adminUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!adminUrl || !adminKey) {
    return null;
  }

  return createAdminClient(adminUrl, adminKey);
}

export async function logAiRequest(params: {
  route: string;
  userId: string | null;
  model: string;
  status: "success" | "error";
  inputChars: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  errorCode?: string | null;
}) {
  if (aiRequestLogsUnavailable) {
    return;
  }

  const admin = getAdminClient();
  if (!admin) {
    return;
  }

  try {
    const { error } = await admin.from("ai_request_logs").insert({
      user_id: params.userId,
      route: params.route,
      model: params.model,
      status: params.status,
      input_chars: params.inputChars,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: params.totalTokens,
      estimated_cost_usd: params.estimatedCostUsd,
      latency_ms: params.latencyMs,
      error_code: params.errorCode ?? null,
    });

    if (error) {
      if (isAiRequestLogsMissingError(error.message)) {
        aiRequestLogsUnavailable = true;
        if (!shouldSuppressAiRequestLogWarnings() && !aiRequestLogsWarningShown) {
          console.warn("ai_request_logs table is unavailable. Skipping AI usage inserts.");
          aiRequestLogsWarningShown = true;
        }
        return;
      }

      if (!shouldSuppressAiRequestLogWarnings() && !aiRequestLogsWarningShown) {
        console.warn("Could not record ai_request_logs row.", error.message);
        aiRequestLogsWarningShown = true;
      }
    }
  } catch (error) {
    if (!shouldSuppressAiRequestLogWarnings() && !aiRequestLogsWarningShown) {
      console.warn(
        "Could not record ai_request_logs row.",
        error instanceof Error ? error.message : String(error)
      );
      aiRequestLogsWarningShown = true;
    }
  }
}

export async function saveSummaryRecord(params: {
  userId: string;
  summary: SummaryResult;
  charCount: number;
  groupId?: string | null;
  groupName?: string | null;
  sourceKind?: SummarySourceKind;
  sourceRange?: SummarySourceRange | null;
  newMessagesCount?: number | null;
}) {
  const admin = getAdminClient();
  if (!admin) {
    throw new PersistError("Summary storage is not configured.", "PERSIST_NOT_CONFIGURED");
  }

  const omittedColumns = new Set<OptionalSummaryInsertColumn>();

  for (let attempt = 0; attempt <= OPTIONAL_SUMMARY_INSERT_COLUMNS.length; attempt += 1) {
    const { data, error } = await admin
      .from("summaries")
      .insert(getSummaryInsertPayload(params, { omittedColumns }))
      .select("id")
      .single<{ id: string }>();

    if (!error && data?.id) {
      return data.id;
    }

    const missingColumn = error ? getMissingSummaryInsertColumn(error) : null;
    if (missingColumn && !omittedColumns.has(missingColumn)) {
      omittedColumns.add(missingColumn);
      continue;
    }

    throw new PersistError("Could not save summary.", "SUMMARY_SAVE_FAILED");
  }

  throw new PersistError("Could not save summary.", "SUMMARY_SAVE_FAILED");
}

export async function seedTodosFromSummary(userId: string, actionItems: string[]): Promise<void> {
  const admin = getAdminClient();
  if (!admin) {
    return;
  }

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

  if (rows.length === 0) {
    return;
  }

  try {
    await admin.from("user_todos").insert(rows);
  } catch {
    return;
  }
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

export async function reserveUsageQuota(params: {
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

export async function releaseUsageQuota(reservation: UsageReservation): Promise<void> {
  if (reservation.kind === "daily") {
    await incrementUsageDailyAtomic(reservation.userId, reservation.dateKey, -1);
    return;
  }

  await incrementLifetimeFreeUsageAtomic(reservation.userId, -1);
}

export async function resolveUserTier(params: {
  userId: string;
  plan: string | null;
  trialExpiresAt: string | null;
}) {
  const dateKey = getUtcDateKey();
  return {
    dateKey,
    tierKey: getTierKey(params.plan ?? "free", params.trialExpiresAt),
  };
}
