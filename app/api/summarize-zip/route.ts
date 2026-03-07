import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatNumber } from "@/lib/format";
import { summarizeZipMessages, type ZipFactCategory, type ZipFactItem, type ZipFactsBlock } from "@/lib/ai/summarize-zip";
import type { LangPref, SummaryResult, SummaryUsage, SummaryPromptContext } from "@/lib/ai/summarize";
import { ensureChatGroup } from "@/lib/chat-groups";
import { toImportantDateArray } from "@/lib/ai/summarize";
import { extractTextFilesFromZip } from "@/lib/chat-import/zip";
import {
  inferGroupLabelFromFilename,
  normalizeComparableText,
  normalizeDisplayText,
  normalizeGroupKey,
  parseWhatsAppExport,
  type ParsedChatMessage,
  type SummarizeZipRange,
} from "@/lib/chat-import/whatsapp";
import { normalizeFamilyContext, normalizeSummaryRetentionDays } from "@/lib/family-context";
import { applySummaryRetentionPolicy } from "@/lib/server/retention";
import { captureRouteException } from "@/lib/sentry";
import { createClient } from "@/lib/supabase/server";

import {
  PersistError,
  MAX_SUMMARY_CHARS,
  getAdminClient,
  hasSupabaseAuthCookie,
  logAiRequest,
  makeSummaryTitle,
  releaseUsageQuota,
  reserveUsageQuota,
  saveSummaryRecord,
  seedTodosFromSummary,
  type SummarySourceRange,
  type UsageReservation,
} from "@/lib/server/summaries";
import { sendPushToUser } from "@/lib/push/server";
import {
  FREE_LIFETIME_CAP,
  getDailyLimit,
  getUtcDateKey,
  resolveEntitlement,
  type EntitlementSubscription,
} from "@/lib/limits";
import { createRouteLogger, getRequestId } from "@/lib/logger";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_MODEL_BODY_CHARS = 1_200;
const FINGERPRINT_LOOKUP_BATCH_SIZE = 500;
const FACT_ORDER: ZipFactCategory[] = ["events", "tasks", "deadlines", "supplies", "exams"];

interface GroupStateRow {
  state_json: {
    dedupe_keys?: unknown;
  } | null;
}

interface ProcessedFingerprintRow {
  msg_fingerprint: string;
}

interface CandidateMessage extends ParsedChatMessage {
  msgFingerprint: string;
}

interface SelectedMessage extends CandidateMessage {
  modelLine: string;
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
    body: makeSummaryTitle(isUrgent ? urgentItem : summary.tldr),
    url: `/history/${savedId}`,
    id: `summary-ready-${savedId}`,
  };
}

function makeFingerprint(groupKey: string, message: ParsedChatMessage) {
  return createHash("sha256")
    .update(`${groupKey}|${message.tsIso}|${message.senderNormalized}|${message.bodyNormalized}`)
    .digest("hex");
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const normalized = normalizeComparableText(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(normalizeDisplayText(value));
  }

  return deduped.filter(Boolean);
}

function truncateMessageBodyForModel(value: string) {
  const flattened = value.replace(/\n+/g, " / ").trim();
  if (flattened.length <= MAX_MODEL_BODY_CHARS) {
    return flattened;
  }

  return `${flattened.slice(0, MAX_MODEL_BODY_CHARS - 1)}…`;
}

function formatMessageForModel(message: CandidateMessage) {
  return `${message.tsIso} | ${message.sender}: ${truncateMessageBodyForModel(message.body)}`;
}

function selectMessagesWithinBudget(messages: CandidateMessage[]) {
  const recentFirst = [...messages].sort((left, right) => right.ts.getTime() - left.ts.getTime());
  const selected: SelectedMessage[] = [];
  let usedChars = 0;

  for (const message of recentFirst) {
    const modelLine = formatMessageForModel(message);
    const nextSize = usedChars + modelLine.length + 1;

    if (nextSize > MAX_SUMMARY_CHARS) {
      if (selected.length === 0) {
        selected.push({
          ...message,
          modelLine: modelLine.slice(0, MAX_SUMMARY_CHARS),
        });
      }
      continue;
    }

    selected.push({
      ...message,
      modelLine,
    });
    usedChars = nextSize;
  }

  return selected.sort((left, right) => left.ts.getTime() - right.ts.getTime());
}

function getCutoffForRange(range: SummarizeZipRange) {
  const now = Date.now();
  const durationMs = range === "24h"
    ? 24 * 60 * 60 * 1000
    : 7 * 24 * 60 * 60 * 1000;

  return new Date(now - durationMs);
}

function buildFactDedupeKey(item: ZipFactItem) {
  return [
    normalizeComparableText(item.title || item.display),
    normalizeComparableText(item.date ?? ""),
    item.kind,
    normalizeComparableText(item.class_name ?? ""),
  ].join("|");
}

function buildDisplayFromFact(item: ZipFactItem) {
  const display = normalizeDisplayText(item.display);
  if (display) {
    return display;
  }

  const parts = [
    item.title,
    item.date ?? "",
    item.details ?? "",
  ]
    .map((part) => normalizeDisplayText(part))
    .filter(Boolean);

  return parts.join(" - ");
}

function getKnownDedupeKeys(row: GroupStateRow | null) {
  const raw = row?.state_json?.dedupe_keys;
  if (!Array.isArray(raw)) {
    return new Set<string>();
  }

  return new Set(
    raw
      .map((value) => normalizeComparableText(String(value ?? "")))
      .filter(Boolean)
  );
}

function filterFactCategory(
  items: ZipFactItem[],
  knownKeys: Set<string>,
  seenInRun: Set<string>,
  emittedKeys: string[]
) {
  const filtered: ZipFactItem[] = [];

  for (const item of items) {
    const dedupeKey = normalizeComparableText(item.dedupe_key) || buildFactDedupeKey(item);
    const display = buildDisplayFromFact(item);

    if (!dedupeKey || !display) {
      continue;
    }

    if (knownKeys.has(dedupeKey) || seenInRun.has(dedupeKey)) {
      continue;
    }

    seenInRun.add(dedupeKey);
    emittedKeys.push(dedupeKey);
    filtered.push({
      ...item,
      display,
      dedupe_key: dedupeKey,
    });
  }

  return filtered;
}

function dedupeSummaryFacts(summary: SummaryResult, facts: ZipFactsBlock, knownKeys: Set<string>) {
  const emittedKeys: string[] = [];
  const seenInRun = new Set<string>();
  const dedupedFacts = {
    events: [] as ZipFactItem[],
    tasks: [] as ZipFactItem[],
    deadlines: [] as ZipFactItem[],
    supplies: [] as ZipFactItem[],
    exams: [] as ZipFactItem[],
  };

  for (const category of FACT_ORDER) {
    dedupedFacts[category] = filterFactCategory(
      facts[category],
      knownKeys,
      seenInRun,
      emittedKeys
    );
  }

  const structuredImportantDates = uniqueStrings([
    ...dedupedFacts.events.map((item) => item.display),
    ...dedupedFacts.deadlines.map((item) => item.display),
    ...dedupedFacts.exams.map((item) => item.display),
  ]);
  const structuredActionItems = uniqueStrings([
    ...dedupedFacts.tasks.map((item) => item.display),
    ...dedupedFacts.supplies.map((item) => item.display),
  ]);
  const originalFactCount = FACT_ORDER.reduce((count, category) => count + facts[category].length, 0);

  return {
    facts: dedupedFacts,
    newKeys: emittedKeys,
    summary: {
      ...summary,
      important_dates:
        structuredImportantDates.length > 0 || originalFactCount > 0
          ? toImportantDateArray(structuredImportantDates)
          : summary.important_dates,
      action_items:
        structuredActionItems.length > 0 || originalFactCount > 0
          ? structuredActionItems
          : uniqueStrings(summary.action_items),
      people_classes: uniqueStrings(summary.people_classes),
      links: uniqueStrings(summary.links),
      questions: uniqueStrings(summary.questions),
    } satisfies SummaryResult,
  };
}

async function findExistingFingerprints(
  admin: SupabaseClient,
  userId: string,
  groupId: string,
  fingerprints: string[]
) {
  const existing = new Set<string>();

  for (let index = 0; index < fingerprints.length; index += FINGERPRINT_LOOKUP_BATCH_SIZE) {
    const chunk = fingerprints.slice(index, index + FINGERPRINT_LOOKUP_BATCH_SIZE);
    if (chunk.length === 0) {
      continue;
    }

    const { data, error } = await admin
      .from("processed_message_fingerprints")
      .select("msg_fingerprint")
      .eq("user_id", userId)
      .eq("group_id", groupId)
      .in("msg_fingerprint", chunk);

    if (error) {
      throw new PersistError("Could not read processed messages.", "FINGERPRINT_LOOKUP_FAILED");
    }

    for (const row of (data ?? []) as ProcessedFingerprintRow[]) {
      existing.add(row.msg_fingerprint);
    }
  }

  return existing;
}

async function loadGroupState(admin: SupabaseClient, userId: string, groupId: string) {
  const { data, error } = await admin
    .from("group_state")
    .select("state_json")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .maybeSingle<GroupStateRow>();

  if (error) {
    throw new PersistError("Could not load chat group state.", "GROUP_STATE_READ_FAILED");
  }

  return data ?? null;
}

async function saveGroupState(
  admin: SupabaseClient,
  userId: string,
  groupId: string,
  dedupeKeys: string[]
) {
  const { error } = await admin.from("group_state").upsert(
    {
      user_id: userId,
      group_id: groupId,
      state_json: {
        dedupe_keys: dedupeKeys,
      },
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,group_id",
    }
  );

  if (error) {
    throw new PersistError("Could not update chat group state.", "GROUP_STATE_WRITE_FAILED");
  }
}

async function insertProcessedFingerprints(
  admin: SupabaseClient,
  userId: string,
  groupId: string,
  messages: SelectedMessage[]
) {
  if (messages.length === 0) {
    return;
  }

  const { error } = await admin.from("processed_message_fingerprints").upsert(
    messages.map((message) => ({
      user_id: userId,
      group_id: groupId,
      msg_fingerprint: message.msgFingerprint,
      msg_ts: message.tsIso,
    })),
    {
      onConflict: "user_id,group_id,msg_fingerprint",
      ignoreDuplicates: true,
    }
  );

  if (error) {
    throw new PersistError("Could not store processed messages.", "FINGERPRINT_WRITE_FAILED");
  }
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function ensureZipFile(entry: FormDataEntryValue | null) {
  if (!(entry instanceof File)) {
    return null;
  }

  if (entry.size <= 0 || entry.size > MAX_UPLOAD_BYTES) {
    return null;
  }

  return entry;
}

function dedupeUploadMessages(messages: ParsedChatMessage[], groupKey: string) {
  const deduped = new Map<string, CandidateMessage>();

  for (const message of messages) {
    const msgFingerprint = makeFingerprint(groupKey, message);
    if (!deduped.has(msgFingerprint)) {
      deduped.set(msgFingerprint, {
        ...message,
        msgFingerprint,
      });
    }
  }

  return Array.from(deduped.values()).sort((left, right) => left.ts.getTime() - right.ts.getTime());
}

export async function POST(req: NextRequest) {
  const route = "/api/summarize-zip";
  const requestId = getRequestId(req.headers);
  const logger = createRouteLogger({ route, requestId });
  const requestStartedAt = Date.now();
  logger.info("request.start");

  let authedUserId: string | null = null;
  let tierKey = "free";
  let usageDateKey: string | null = null;
  let selectedCharCount = 0;
  let openAiStartedAt: number | null = null;
  let openAiDurationMs: number | null = null;
  let aiUsage: SummaryUsage | null = null;
  let usageReservation: UsageReservation | null = null;
  let savedId: string | null = null;
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

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

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

    tierKey = entitlement.tierKey;
    summaryRetentionDays = normalizeSummaryRetentionDays(profile?.summary_retention_days);
    promptContext = {
      sourcePlatform: "whatsapp",
      familyContext: normalizeFamilyContext(profile?.family_context),
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

  try {
    const formData = await req.formData();
    const rangeValue = getFormString(formData, "range");
    if (rangeValue !== "24h" && rangeValue !== "7d") {
      logger.warn("request.rejected", { userId: authedUserId, errorCode: "INVALID_RANGE" });
      return NextResponse.json(
        {
          error: "Range must be 24h or 7d.",
          code: "INVALID_RANGE",
        },
        { status: 400 }
      );
    }

    const range: SummarizeZipRange = rangeValue;
    const groupInput = getFormString(formData, "group_key");
    const langInput = getFormString(formData, "lang_pref");
    const langPref: LangPref =
      langInput === "en" || langInput === "ar" || langInput === "auto"
        ? langInput
        : "auto";
    const file = ensureZipFile(formData.get("file"));

    if (!file) {
      logger.warn("request.rejected", { userId: authedUserId, errorCode: "INVALID_FILE" });
      return NextResponse.json(
        {
          error: `Upload a ZIP archive under ${formatNumber(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
          code: "INVALID_FILE",
        },
        { status: 400 }
      );
    }

    if (!/\.zip$/iu.test(file.name)) {
      logger.warn("request.rejected", { userId: authedUserId, errorCode: "UNSUPPORTED_FILE" });
      return NextResponse.json(
        {
          error: "Upload a .zip chat export.",
          code: "UNSUPPORTED_FILE",
        },
        { status: 400 }
      );
    }

    const groupTitle = normalizeDisplayText(groupInput || inferGroupLabelFromFilename(file.name));
    const groupKey = normalizeGroupKey(groupTitle);
    const admin = getAdminClient();

    if (!admin || !authedUserId) {
      throw new PersistError("Summary storage is not configured.", "PERSIST_NOT_CONFIGURED");
    }

    const { textFiles, ignoredFileCount } = await extractTextFilesFromZip(await file.arrayBuffer());
    if (textFiles.length === 0) {
      logger.warn("request.rejected", { userId: authedUserId, errorCode: "NO_TEXT_FILES" });
      return NextResponse.json(
        {
          error: "No text files were found in that zip archive.",
          code: "NO_TEXT_FILES",
        },
        { status: 400 }
      );
    }

    const parsedMessages = textFiles.flatMap((entry) => parseWhatsAppExport(entry.text));
    if (parsedMessages.length === 0) {
      logger.warn("request.rejected", {
        userId: authedUserId,
        errorCode: "PARSE_FAILED",
        fileCount: textFiles.length,
      });
      return NextResponse.json(
        {
          error: "We could not detect WhatsApp text messages in that export.",
          code: "PARSE_FAILED",
        },
        { status: 400 }
      );
    }

    const chatGroup = await ensureChatGroup(admin, authedUserId, groupTitle);
    const uploadMessages = dedupeUploadMessages(parsedMessages, groupKey);
    const existingFingerprints = await findExistingFingerprints(
      admin,
      authedUserId,
      chatGroup.id,
      uploadMessages.map((message) => message.msgFingerprint)
    );
    const cutoff = getCutoffForRange(range);
    const newMessages = uploadMessages.filter((message) => !existingFingerprints.has(message.msgFingerprint));
    const rangedNewMessages = newMessages.filter((message) => message.ts >= cutoff);

    if (rangedNewMessages.length === 0) {
      logger.info("request.no_new_messages", {
        userId: authedUserId,
        groupId: chatGroup.id,
        groupKey,
        range,
        ignoredFileCount,
        totalParsedMessages: uploadMessages.length,
      });
      return NextResponse.json({
        status: "no_new_messages",
        range,
        group: {
          id: chatGroup.id,
          key: chatGroup.group_key,
          title: chatGroup.group_title,
        },
        newMessagesProcessed: 0,
        ignoredFileCount,
      });
    }

    const selectedMessages = selectMessagesWithinBudget(rangedNewMessages);
    const transcript = selectedMessages.map((message) => message.modelLine).join("\n");
    selectedCharCount = transcript.length;

    const reservation = await reserveUsageQuota({
      userId: authedUserId,
      tierKey,
      dateKey: usageDateKey ?? getUtcDateKey(),
    });

    if (!reservation.ok) {
      logger.warn("limit.hit", {
        userId: authedUserId,
        errorCode: reservation.code,
        tierKey,
        dateKey: usageDateKey ?? getUtcDateKey(),
        limit:
          reservation.code === "DAILY_CAP"
            ? getDailyLimit(tierKey)
            : FREE_LIFETIME_CAP,
      });
      return NextResponse.json(
        {
          error: "limit_reached",
          code: reservation.code,
        },
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

    openAiStartedAt = Date.now();
    logger.info("openai.start", {
      userId: authedUserId,
      groupId: chatGroup.id,
      range,
      selectedMessages: selectedMessages.length,
      charCount: selectedCharCount,
      langPref,
    });

    const aiResult = await summarizeZipMessages(transcript, langPref, {
      testAiResponseHeader: req.headers.get("x-fazumi-test-ai-response"),
      context: {
        ...promptContext,
        groupTitle,
      },
    });
    aiUsage = aiResult.usage;
    openAiDurationMs = Date.now() - openAiStartedAt;

    const groupState = await loadGroupState(admin, authedUserId, chatGroup.id);
    const knownKeys = getKnownDedupeKeys(groupState);
    const { summary, newKeys } = dedupeSummaryFacts(aiResult.summary, aiResult.facts, knownKeys);

    summary.char_count = selectedCharCount;

    await logAiRequest({
      route,
      userId: authedUserId,
      model: aiUsage.model,
      status: "success",
      inputChars: selectedCharCount,
      promptTokens: aiUsage.promptTokens,
      completionTokens: aiUsage.completionTokens,
      totalTokens: aiUsage.totalTokens,
      estimatedCostUsd: aiUsage.estimatedCostUsd,
      latencyMs: openAiDurationMs,
      errorCode: null,
    });

    savedId = await saveSummaryRecord({
      userId: authedUserId,
      summary,
      charCount: selectedCharCount,
      groupId: chatGroup.id,
      sourceKind: "zip",
      sourceRange: range as SummarySourceRange,
      newMessagesCount: selectedMessages.length,
    });

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

    await insertProcessedFingerprints(admin, authedUserId, chatGroup.id, selectedMessages);
    await saveGroupState(
      admin,
      authedUserId,
      chatGroup.id,
      Array.from(new Set([...knownKeys, ...newKeys]))
    );

    if (summary.action_items.length > 0) {
      await seedTodosFromSummary(authedUserId, summary.action_items);
    }

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

    logger.info("request.success", {
      userId: authedUserId,
      summaryId: savedId,
      groupId: chatGroup.id,
      groupKey,
      range,
      selectedMessages: selectedMessages.length,
      ignoredFileCount,
      charCount: selectedCharCount,
      langDetected: summary.lang_detected,
      model: aiUsage.model,
      promptTokens: aiUsage.promptTokens,
      completionTokens: aiUsage.completionTokens,
      totalTokens: aiUsage.totalTokens,
      estimatedCostUsd: aiUsage.estimatedCostUsd,
      openAiDurationMs,
      durationMs: Date.now() - requestStartedAt,
    });

    return NextResponse.json({
      status: "ok",
      summary,
      savedId,
      range,
      group: {
        id: chatGroup.id,
        key: chatGroup.group_key,
        title: chatGroup.group_title,
      },
      newMessagesProcessed: selectedMessages.length,
      ignoredFileCount,
    });
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
    const estimatedPromptTokens =
      selectedCharCount > 0 ? Math.max(Math.ceil(selectedCharCount / 4), 1) : 0;

    if (!(err instanceof PersistError) && openAiStartedAt !== null && !aiUsage) {
      await logAiRequest({
        route,
        userId: authedUserId,
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        status: "error",
        inputChars: selectedCharCount,
        promptTokens: estimatedPromptTokens,
        completionTokens: 0,
        totalTokens: estimatedPromptTokens,
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
          releaseError:
            releaseError instanceof Error ? releaseError.message : String(releaseError),
        });
      }
    }

    logger.error("request.failed", {
      userId: authedUserId,
      summaryId: savedId,
      charCount: selectedCharCount || undefined,
      openAiDurationMs: (openAiDurationMs ?? failedOpenAiLatencyMs) || undefined,
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
      charCount: selectedCharCount || undefined,
      openAiDurationMs: openAiDurationMs ?? undefined,
    });

    if (err instanceof PersistError) {
      return NextResponse.json({ error: message, code: errorCode }, { status: 500 });
    }

    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        { error: "AI service is not configured. Please add your OPENAI_API_KEY." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate summary. Please try again.", code: errorCode },
      { status: 500 }
    );
  }
}


