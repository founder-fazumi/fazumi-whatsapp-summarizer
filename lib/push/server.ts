import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { toImportantDateArray } from "@/lib/ai/summarize";
import type {
  PushNotificationPayload,
  WebPushSubscriptionPayload,
} from "@/lib/push/types";
import {
  getTimeZoneDateKey,
  getTimeZoneDayRange,
  getTimeZoneParts,
  normalizeTimeZone,
} from "@/lib/push/timezone";

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  subscription: WebPushSubscriptionPayload;
  timezone?: string | null;
  last_notified_at?: string | null;
}

interface MorningDigestSummaryRow {
  id: string;
  title: string;
  tldr: string;
  important_dates: unknown;
  lang_detected: string | null;
}

let vapidConfigured = false;

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@fazumi.app";

  return {
    publicKey,
    privateKey,
    subject,
  };
}

function ensureWebPushConfigured() {
  const { publicKey, privateKey, subject } = getVapidConfig();

  if (!publicKey || !privateKey) {
    return false;
  }

  if (!vapidConfigured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }

  return true;
}

export function isPushConfigured() {
  const { publicKey, privateKey } = getVapidConfig();
  return Boolean(publicKey && privateKey);
}

function truncateNotificationText(value: string, maxLength = 120) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
}

async function updatePushSubscriptionStatus(id: string, values: Record<string, string | null>) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Could not update push subscription: ${error.message}`);
  }
}

export async function upsertPushSubscription(options: {
  userId: string;
  subscription: WebPushSubscriptionPayload;
  timezone?: string | null;
  userAgent?: string | null;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: options.userId,
      endpoint: options.subscription.endpoint,
      subscription: options.subscription,
      timezone: options.timezone ?? null,
      user_agent: options.userAgent ?? null,
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    throw new Error(`Could not save push subscription: ${error.message}`);
  }
}

export async function removePushSubscription(endpoint: string, userId?: string | null) {
  const admin = createAdminClient();
  let query = admin.from("push_subscriptions").delete().eq("endpoint", endpoint);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { error } = await query;
  if (error) {
    throw new Error(`Could not remove push subscription: ${error.message}`);
  }
}

export async function sendPushNotification(
  subscription: WebPushSubscriptionPayload,
  payload: PushNotificationPayload
) {
  if (!ensureWebPushConfigured()) {
    throw new Error("Web push is not configured.");
  }

  await webpush.sendNotification(
    subscription as Parameters<typeof webpush.sendNotification>[0],
    JSON.stringify(payload)
  );
}

export async function sendPushToUser(userId: string, payload: PushNotificationPayload) {
  if (!ensureWebPushConfigured()) {
    return { sent: 0, staleRemoved: 0, failed: 0 };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, subscription")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Could not load push subscriptions: ${error.message}`);
  }

  let sent = 0;
  let staleRemoved = 0;
  let failed = 0;

  for (const row of (data ?? []) as PushSubscriptionRow[]) {
    try {
      await sendPushNotification(row.subscription, payload);
      await updatePushSubscriptionStatus(row.id, {
        last_error: null,
        last_notified_at: new Date().toISOString(),
      });
      sent += 1;
    } catch (error) {
      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
          ? error.statusCode
          : null;

      if (statusCode === 404 || statusCode === 410) {
        await removePushSubscription(row.endpoint, row.user_id);
        staleRemoved += 1;
        continue;
      }

      failed += 1;
      await updatePushSubscriptionStatus(row.id, {
        last_error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { sent, staleRemoved, failed };
}

async function getMorningDigestSummariesForRange(
  userId: string,
  createdAfterIso: string,
  createdBeforeIso: string | null
) {
  const admin = createAdminClient();
  let query = admin
    .from("summaries")
    .select("id, title, tldr, important_dates, lang_detected")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .gte("created_at", createdAfterIso)
    .order("created_at", { ascending: false })
    .limit(3);

  if (createdBeforeIso) {
    query = query.lt("created_at", createdBeforeIso);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Could not load morning digest summaries: ${error.message}`);
  }

  return (data ?? []) as MorningDigestSummaryRow[];
}

function formatDigestDate(value: unknown) {
  const item = toImportantDateArray(value)[0];
  if (!item) {
    return null;
  }

  const parts = [item.label, item.time].filter(Boolean);
  return parts.join(" • ");
}

export async function sendMorningDigest(now = new Date()) {
  if (!ensureWebPushConfigured()) {
    return {
      processedUsers: 0,
      notifiedUsers: 0,
      sentSubscriptions: 0,
      skippedUsers: 0,
      failedSubscriptions: 0,
      staleRemoved: 0,
      eligibleTimezones: 0,
      generatedAt: now.toISOString(),
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, subscription, timezone, last_notified_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load digest subscribers: ${error.message}`);
  }

  const subscriptions = (data ?? []) as PushSubscriptionRow[];
  const processedUsers = new Set(
    subscriptions
      .map((row) => row.user_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  );
  const summaryCache = new Map<string, Promise<MorningDigestSummaryRow[]>>();
  const notifiedUsers = new Set<string>();
  const skippedUsers = new Set<string>();
  const eligibleTimezones = new Set<string>();

  let sentSubscriptions = 0;
  let failedSubscriptions = 0;
  let staleRemoved = 0;

  for (const row of subscriptions) {
    const timeZone = normalizeTimeZone(row.timezone);
    const localNow = getTimeZoneParts(now, timeZone);

    if (localNow.hour !== 7) {
      skippedUsers.add(row.user_id);
      continue;
    }

    eligibleTimezones.add(timeZone);
    const localDateKey = getTimeZoneDateKey(now, timeZone);

    if (
      row.last_notified_at &&
      getTimeZoneDateKey(new Date(row.last_notified_at), timeZone) === localDateKey
    ) {
      continue;
    }

    const digestWindow = getTimeZoneDayRange(now, timeZone, -1);
    const summaryCacheKey = `${row.user_id}:${digestWindow.start.toISOString()}:${digestWindow.end.toISOString()}`;

    if (!summaryCache.has(summaryCacheKey)) {
      summaryCache.set(
        summaryCacheKey,
        getMorningDigestSummariesForRange(
          row.user_id,
          digestWindow.start.toISOString(),
          digestWindow.end.toISOString()
        )
      );
    }

    const summaries = await summaryCache.get(summaryCacheKey)!;
    if (summaries.length === 0) {
      skippedUsers.add(row.user_id);
      continue;
    }

    const firstSummary = summaries[0];
    const upcomingDate = formatDigestDate(firstSummary.important_dates);
    const isArabic = firstSummary.lang_detected === "ar";
    const payload: PushNotificationPayload = {
      title:
        summaries.length === 1
          ? isArabic
            ? "صباح الخير! ملخص المدرسة جاهز"
            : "Good morning! Your school digest is ready"
          : isArabic
            ? `صباح الخير! لديك ${summaries.length} تحديثات مدرسية`
            : `Good morning! You have ${summaries.length} school updates`,
      body: truncateNotificationText(
        upcomingDate
          ? isArabic
            ? `${firstSummary.title}. الموعد التالي: ${upcomingDate}.`
            : `${firstSummary.title}. Next up: ${upcomingDate}.`
          : firstSummary.tldr
      ),
      url: "/dashboard",
      id: `morning-digest-${digestWindow.dateKey}-${row.id}`,
    };

    try {
      await sendPushNotification(row.subscription, payload);
      await updatePushSubscriptionStatus(row.id, {
        last_error: null,
        last_notified_at: now.toISOString(),
      });
      notifiedUsers.add(row.user_id);
      sentSubscriptions += 1;
    } catch (pushError) {
      const statusCode =
        typeof pushError === "object" &&
        pushError !== null &&
        "statusCode" in pushError &&
        typeof pushError.statusCode === "number"
          ? pushError.statusCode
          : null;

      if (statusCode === 404 || statusCode === 410) {
        await removePushSubscription(row.endpoint, row.user_id);
        staleRemoved += 1;
        continue;
      }

      failedSubscriptions += 1;
      await updatePushSubscriptionStatus(row.id, {
        last_error:
          pushError instanceof Error ? pushError.message : String(pushError),
      });
    }
  }

  return {
    processedUsers: processedUsers.size,
    notifiedUsers: notifiedUsers.size,
    sentSubscriptions,
    skippedUsers: skippedUsers.size,
    failedSubscriptions,
    staleRemoved,
    eligibleTimezones: eligibleTimezones.size,
    generatedAt: now.toISOString(),
  };
}
