import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatNumber } from "@/lib/format";
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
  updated_at?: string | null;
  last_notified_at?: string | null;
  last_morning_digest_at?: string | null;
  last_weekly_digest_at?: string | null;
}

interface MorningDigestSummaryRow {
  id: string;
  action_items: unknown;
  group_name: string | null;
  lang_detected: string | null;
}

interface WeeklyDigestSummaryRow {
  id: string;
  group_name: string | null;
  lang_detected: string | null;
}

interface ReengagementState {
  profile_updated_at: string | null;
  latest_summary_at: string | null;
  lang_pref: string | null;
  lang_detected: string | null;
  last_reengagement_sent_at: string | null;
}

interface NotificationProfileRow {
  id: string;
  lang_pref: string | null;
  updated_at: string | null;
  last_reengagement_sent_at: string | null;
}

interface LatestSummaryRow {
  created_at: string | null;
  lang_detected: string | null;
}

let vapidConfigured = false;
const WEEKLY_PROGRESS_DIGEST_DAY = 0;
const MORNING_DIGEST_WINDOW_DAYS = 7;
const REENGAGEMENT_GAP_MS = 14 * 24 * 60 * 60 * 1000;
const REENGAGEMENT_COOLDOWN_MS = 28 * 24 * 60 * 60 * 1000;

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@fazumi.com";

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

function getActionItemCount(value: unknown) {
  return Array.isArray(value) ? value.filter(Boolean).length : 0;
}

function getRecentGroupNames(summaries: MorningDigestSummaryRow[]) {
  return [...new Set(
    summaries
      .map((summary) => summary.group_name?.trim())
      .filter((value): value is string => Boolean(value))
  )].slice(0, 2);
}

function buildMorningDigestBody(options: {
  summaryCount: number;
  actionItemCount: number;
  groupNames: string[];
  isArabic: boolean;
}) {
  if (options.summaryCount === 0) {
    return options.isArabic
      ? "صباح الخير — تاريخك المدرسي هنا عند الحاجة."
      : "Good morning — your school history is here when you need it.";
  }

  const base = options.isArabic
    ? `صباح الخير — ${formatNumber(options.summaryCount)} ملخصات مدرسية محفوظة هذا الأسبوع. ${formatNumber(options.actionItemCount)} بنود إجراءات مكتشفة.`
    : `Good morning — ${formatNumber(options.summaryCount)} school summaries saved this week. ${formatNumber(options.actionItemCount)} action items found.`;

  if (options.groupNames.length === 0) {
    return base;
  }

  const groupMessage = options.isArabic
    ? ` آخر المجموعات: ${options.groupNames.join("، ")}.`
    : ` Recent groups: ${options.groupNames.join(", ")}.`;

  return `${base}${groupMessage}`;
}

function buildMorningDigestPayload(options: {
  summaryCount: number;
  actionItemCount: number;
  groupNames: string[];
  isArabic: boolean;
  id: string;
}): PushNotificationPayload {
  return {
    title: options.isArabic ? "صباح الخير" : "Good morning",
    body: truncateNotificationText(buildMorningDigestBody(options), 140),
    url: "/history",
    id: options.id,
  };
}

async function getNotificationProfiles(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) {
    return new Map<string, NotificationProfileRow>();
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, lang_pref, updated_at, last_reengagement_sent_at")
    .in("id", ids);

  if (error) {
    throw new Error(`Could not load notification profiles: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as NotificationProfileRow[]).map((row) => [row.id, row])
  );
}

async function getLatestSummaryRow(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("summaries")
    .select("created_at, lang_detected")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load latest summary signal: ${error.message}`);
  }

  return {
    created_at: data?.created_at ?? null,
    lang_detected: data?.lang_detected ?? null,
  } satisfies LatestSummaryRow;
}

async function getUserHasVerifiedEmail(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);

  if (error) {
    throw new Error(`Could not load auth user for re-engagement: ${error.message}`);
  }

  return Boolean(data.user?.email_confirmed_at);
}

async function getMorningDigestSummariesForRange(
  userId: string,
  createdAfterIso: string,
  createdBeforeIso: string | null
) {
  const admin = createAdminClient();
  let query = admin
    .from("summaries")
    .select("id, action_items, group_name, lang_detected")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .gte("created_at", createdAfterIso)
    .order("created_at", { ascending: false })
    .limit(20);

  if (createdBeforeIso) {
    query = query.lt("created_at", createdBeforeIso);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Could not load morning digest summaries: ${error.message}`);
  }

  return (data ?? []) as MorningDigestSummaryRow[];
}

function getLocalWeekday(date: Date, timeZone?: string | null) {
  const parts = getTimeZoneParts(date, timeZone);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function pluralizeEnglish(count: number, singular: string, plural: string) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

function buildWeeklyProgressBody(options: {
  summaryCount: number;
  groupCount: number;
  isArabic: boolean;
}) {
  const minutesSaved = options.summaryCount * 4;

  if (options.isArabic) {
    return options.groupCount > 0
      ? `هذا الأسبوع تم تنظيم ${formatNumber(options.summaryCount)} تحديثات مدرسية عبر ${formatNumber(options.groupCount)} مجموعات. وفّر ذلك نحو ${formatNumber(minutesSaved)} دقيقة من إعادة القراءة.`
      : `هذا الأسبوع تم تنظيم ${formatNumber(options.summaryCount)} تحديثات مدرسية. وفّر ذلك نحو ${formatNumber(minutesSaved)} دقيقة من إعادة القراءة.`;
  }

  const updatesLabel = pluralizeEnglish(
    options.summaryCount,
    "school update",
    "school updates"
  );
  const groupsLabel = pluralizeEnglish(options.groupCount, "group", "groups");
  const minutesLabel = pluralizeEnglish(minutesSaved, "minute", "minutes");

  return options.groupCount > 0
    ? `${updatesLabel} organized across ${groupsLabel} this week. About ${minutesLabel} of re-reading avoided.`
    : `${updatesLabel} organized this week. About ${minutesLabel} of re-reading avoided.`;
}

async function getWeeklyDigestSummariesForRange(
  userId: string,
  createdAfterIso: string,
  createdBeforeIso: string
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("summaries")
    .select("id, group_name, lang_detected")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .gte("created_at", createdAfterIso)
    .lt("created_at", createdBeforeIso)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load weekly digest summaries: ${error.message}`);
  }

  return (data ?? []) as WeeklyDigestSummaryRow[];
}

async function updateProfileReengagementStatus(userId: string, sentAtIso: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      last_reengagement_sent_at: sentAtIso,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Could not update re-engagement status: ${error.message}`);
  }
}

function getValidTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function shouldSendReengagement(state: ReengagementState, now: Date) {
  const profileUpdatedMs = getValidTimestamp(state.profile_updated_at);
  const latestSummaryMs = getValidTimestamp(state.latest_summary_at);
  const lastActivityMs = Math.max(profileUpdatedMs ?? 0, latestSummaryMs ?? 0);

  if (lastActivityMs <= 0) {
    return false;
  }

  if (now.getTime() - lastActivityMs < REENGAGEMENT_GAP_MS) {
    return false;
  }

  if (!state.last_reengagement_sent_at) {
    return true;
  }

  const lastReengagementMs = getValidTimestamp(state.last_reengagement_sent_at);
  if (lastReengagementMs === null) {
    return true;
  }

  return now.getTime() - lastReengagementMs >= REENGAGEMENT_COOLDOWN_MS;
}

function buildReengagementPayload(isArabic: boolean): PushNotificationPayload {
  return {
    title: isArabic ? "الدراسة عادت" : "School's back in session",
    body: isArabic
      ? "ملخصاتك وسياقك المحفوظ هنا عند الحاجة."
      : "Your summaries and saved context are here when you need them.",
    url: "/summarize",
  };
}

export async function sendReengagementNotifications(now = new Date()) {
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
    .select("id, user_id, endpoint, subscription, timezone, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load re-engagement subscribers: ${error.message}`);
  }

  const subscriptionRows = (data ?? []) as PushSubscriptionRow[];
  const subscriptionsByUser = new Map<string, PushSubscriptionRow[]>();
  const eligibleTimezones = new Set<string>();

  for (const row of subscriptionRows) {
    const timeZone = normalizeTimeZone(row.timezone);
    if (getTimeZoneParts(now, timeZone).hour !== 7) {
      continue;
    }

    eligibleTimezones.add(timeZone);
    const existingRows = subscriptionsByUser.get(row.user_id) ?? [];
    existingRows.push(row);
    subscriptionsByUser.set(row.user_id, existingRows);
  }

  const userIds = [...subscriptionsByUser.keys()];
  const profileMap = await getNotificationProfiles(userIds);
  const latestSummaryCache = new Map<string, Promise<LatestSummaryRow>>();
  const verifiedEmailCache = new Map<string, Promise<boolean>>();
  const notifiedUsers = new Set<string>();

  let sentSubscriptions = 0;
  let skippedUsers = 0;
  let failedSubscriptions = 0;
  let staleRemoved = 0;

  for (const userId of userIds) {
    if (!verifiedEmailCache.has(userId)) {
      verifiedEmailCache.set(userId, getUserHasVerifiedEmail(userId));
    }

    if (!(await verifiedEmailCache.get(userId)!)) {
      skippedUsers += 1;
      continue;
    }

    const profile = profileMap.get(userId);
    if (!profile) {
      skippedUsers += 1;
      continue;
    }

    if (!latestSummaryCache.has(userId)) {
      latestSummaryCache.set(userId, getLatestSummaryRow(userId));
    }

    const latestSummary = await latestSummaryCache.get(userId)!;
    const state = {
      profile_updated_at: profile.updated_at,
      latest_summary_at: latestSummary.created_at,
      lang_pref: profile.lang_pref,
      lang_detected: latestSummary.lang_detected,
      last_reengagement_sent_at: profile.last_reengagement_sent_at,
    } satisfies ReengagementState;

    if (!shouldSendReengagement(state, now)) {
      skippedUsers += 1;
      continue;
    }

    const isArabic =
      state.lang_pref === "ar" ||
      (state.lang_pref !== "en" && state.lang_detected === "ar");
    const candidateRows = subscriptionsByUser.get(userId) ?? [];

    let sentForUser = false;

    for (const row of candidateRows) {
      const payload = {
        ...buildReengagementPayload(isArabic),
        id: `reengagement-${userId}-${getTimeZoneDateKey(now, normalizeTimeZone(row.timezone))}`,
      };

      try {
        await sendPushNotification(row.subscription, payload);
        await updatePushSubscriptionStatus(row.id, {
          last_error: null,
          last_notified_at: now.toISOString(),
        });
        await updateProfileReengagementStatus(userId, now.toISOString());
        notifiedUsers.add(userId);
        sentSubscriptions += 1;
        sentForUser = true;
        break;
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

    if (!sentForUser) {
      skippedUsers += 1;
    }
  }

  return {
    processedUsers: userIds.length,
    notifiedUsers: notifiedUsers.size,
    sentSubscriptions,
    skippedUsers,
    failedSubscriptions,
    staleRemoved,
    eligibleTimezones: eligibleTimezones.size,
    generatedAt: now.toISOString(),
  };
}

export async function sendMorningDigest(now = new Date()) {
  if (!ensureWebPushConfigured()) {
    return {
      processedUsers: 0,
      notifiedUsers: 0,
      sentSubscriptions: 0,
      weeklyNotifiedUsers: 0,
      weeklySentSubscriptions: 0,
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
    .select(
      "id, user_id, endpoint, subscription, timezone, last_morning_digest_at, last_weekly_digest_at"
    )
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
  const profileMap = await getNotificationProfiles([...processedUsers]);
  const summaryCache = new Map<string, Promise<MorningDigestSummaryRow[]>>();
  const weeklySummaryCache = new Map<string, Promise<WeeklyDigestSummaryRow[]>>();
  const notifiedUsers = new Set<string>();
  const weeklyNotifiedUsers = new Set<string>();
  const skippedUsers = new Set<string>();
  const eligibleTimezones = new Set<string>();

  let sentSubscriptions = 0;
  let weeklySentSubscriptions = 0;
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

    if (getLocalWeekday(now, timeZone) === WEEKLY_PROGRESS_DIGEST_DAY) {
      const currentLocalDay = getTimeZoneDayRange(now, timeZone, 0);
      const weeklyAlreadySent =
        row.last_weekly_digest_at &&
        new Date(row.last_weekly_digest_at).getTime() >= currentLocalDay.start.getTime();

      if (!weeklyAlreadySent) {
        const weeklyWindow = getTimeZoneDayRange(now, timeZone, -7);
        const weeklyCacheKey = `${row.user_id}:${weeklyWindow.start.toISOString()}:${currentLocalDay.start.toISOString()}`;

        if (!weeklySummaryCache.has(weeklyCacheKey)) {
          weeklySummaryCache.set(
            weeklyCacheKey,
            getWeeklyDigestSummariesForRange(
              row.user_id,
              weeklyWindow.start.toISOString(),
              currentLocalDay.start.toISOString()
            )
          );
        }

        const weeklySummaries = await weeklySummaryCache.get(weeklyCacheKey)!;
        if (weeklySummaries.length > 0) {
          const isArabic = weeklySummaries[0]?.lang_detected === "ar";
          const groupCount = new Set(
            weeklySummaries
              .map((summary) => summary.group_name?.trim())
              .filter((value): value is string => Boolean(value))
          ).size;
          const payload: PushNotificationPayload = {
            title: isArabic
              ? "ملخص التقدم الأسبوعي جاهز"
              : "Your weekly school progress is ready",
            body: truncateNotificationText(
              buildWeeklyProgressBody({
                summaryCount: weeklySummaries.length,
                groupCount,
                isArabic,
              }),
              140
            ),
            url: "/dashboard",
            id: `weekly-progress-${currentLocalDay.dateKey}-${row.id}`,
          };

          try {
            await sendPushNotification(row.subscription, payload);
            await updatePushSubscriptionStatus(row.id, {
              last_error: null,
              last_notified_at: now.toISOString(),
              last_weekly_digest_at: now.toISOString(),
            });
            notifiedUsers.add(row.user_id);
            weeklyNotifiedUsers.add(row.user_id);
            sentSubscriptions += 1;
            weeklySentSubscriptions += 1;
            continue;
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
            continue;
          }
        }
      }
    }

    const localDateKey = getTimeZoneDateKey(now, timeZone);

    if (
      row.last_morning_digest_at &&
      getTimeZoneDateKey(new Date(row.last_morning_digest_at), timeZone) === localDateKey
    ) {
      continue;
    }

    const currentLocalDay = getTimeZoneDayRange(now, timeZone, 0);
    const digestWindow = getTimeZoneDayRange(now, timeZone, -MORNING_DIGEST_WINDOW_DAYS);
    const summaryCacheKey = `${row.user_id}:${digestWindow.start.toISOString()}:${currentLocalDay.start.toISOString()}`;

    if (!summaryCache.has(summaryCacheKey)) {
      summaryCache.set(
        summaryCacheKey,
        getMorningDigestSummariesForRange(
          row.user_id,
          digestWindow.start.toISOString(),
          currentLocalDay.start.toISOString()
        )
      );
    }

    const summaries = await summaryCache.get(summaryCacheKey)!;
    const recentGroupNames = getRecentGroupNames(summaries);
    const actionItemCount = summaries.reduce(
      (total, summary) => total + getActionItemCount(summary.action_items),
      0
    );
    const profile = profileMap.get(row.user_id);
    const isArabic =
      summaries[0]?.lang_detected === "ar" ||
      (!summaries[0] && profile?.lang_pref === "ar");
    const payload = buildMorningDigestPayload({
      summaryCount: summaries.length,
      actionItemCount,
      groupNames: recentGroupNames,
      isArabic,
      id: `morning-digest-${currentLocalDay.dateKey}-${row.id}`,
    });

    try {
      await sendPushNotification(row.subscription, payload);
      await updatePushSubscriptionStatus(row.id, {
        last_error: null,
        last_morning_digest_at: now.toISOString(),
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
    weeklyNotifiedUsers: weeklyNotifiedUsers.size,
    weeklySentSubscriptions,
    skippedUsers: skippedUsers.size,
    failedSubscriptions,
    staleRemoved,
    eligibleTimezones: eligibleTimezones.size,
    generatedAt: now.toISOString(),
  };
}
