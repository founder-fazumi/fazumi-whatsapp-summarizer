import { getTierKey } from "@/lib/limits";
import { resolveAiPricing } from "@/lib/ai/usage";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatNumber } from "@/lib/format";
import type {
  AdminAiUsageData,
  AdminFeedbackData,
  AdminFeedbackRow,
  AdminFeedbackStatus,
  AdminFeedbackType,
  AdminInboxData,
  AdminInboxPriority,
  AdminIncomeData,
  AdminMetricStatus,
  AdminOverviewMetrics,
  AdminPlanType,
  AdminSupportRequestRow,
  AdminSupportStatus,
  AdminSubscriptionEvent,
  AdminUserRecord,
  AdminUsersData,
  AdminWebhookDeliveryRow,
} from "@/lib/admin/types";

const TABLE_PAGE_SIZE = 1000;
const AUTH_PAGE_SIZE = 100;

// ─────────────────────────────────────────────────────────────────────────────
// @price-sync — Update these when prices or fees change.
//
// PLAN_PRICES:   Match the variant prices in your Lemon Squeezy dashboard.
//                Settings → Products → open each variant → "Price"
//
// QAR_PER_USD:   Central Bank of Qatar mid-rate. Update monthly.
//                https://www.cbq.qa/EN/Pages/ExchangeRates.aspx
//
// LEMON_*:       Lemon Squeezy fee schedule (as of 2026-03).
//                https://www.lemonsqueezy.com/pricing
//                Platform fee: 5% + $0.50 per transaction
//                Subscription surcharge: 0.5% (charged on top of platform fee)
//                Non-US bank payout fee: 1%
//                Minimum payout threshold: $50
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_PRICES = {
  monthly: 9.99,
  annual: 99.99,
  founder: 149,
} as const;
const QAR_PER_USD = 3.64; // Last updated: 2026-03-04
const LEMON_PAYOUT_THRESHOLD_USD = 50;
const LEMON_PLATFORM_FEE_RATE = 0.05;
const LEMON_SUBSCRIPTION_FEE_RATE = 0.005;
const LEMON_FIXED_FEE_USD = 0.5;
const NON_US_BANK_PAYOUT_FEE_RATE = 0.01;

interface ProfileRow {
  id: string;
  full_name: string | null;
  plan: string | null;
  trial_expires_at: string | null;
  created_at: string;
}

interface SummaryRow {
  user_id: string;
  created_at: string;
}

interface SubscriptionRow {
  user_id: string;
  plan_type: string | null;
  status: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string | null;
  ls_subscription_id: string | null;
  ls_order_id: string | null;
}

interface MarketingSpendRow {
  id: string;
  month: string;
  channel: string | null;
  amount: number;
  notes: string | null;
  created_at: string;
}

interface AuthUserRow {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  bannedUntil: string | null;
}

interface AiRequestLogRow {
  id: string;
  user_id: string | null;
  model: string | null;
  status: "success" | "error" | string;
  error_code: string | null;
  input_chars: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  latency_ms: number | null;
  created_at: string;
}

interface UserConsentRow {
  user_id: string | null;
  ip_address: string | null;
  analytics: boolean;
  session_replay: boolean;
  marketing: boolean;
  withdrawn_at: string | null;
  created_at: string;
}

interface PushSubscriptionRow {
  user_id: string;
  timezone: string | null;
  last_notified_at: string | null;
  last_error: string | null;
  created_at: string;
}

interface FeedbackRowLegacy {
  id: string;
  phone_e164: string | null;
  message: string;
  meta_json: Record<string, unknown> | null;
  created_at: string;
}

interface FeedbackRowModern {
  id: string;
  user_id: string | null;
  email: string | null;
  phone_e164: string | null;
  subject: string | null;
  locale: string | null;
  type: string | null;
  status: string | null;
  priority: string | null;
  message: string;
  rating: string | null;
  tags: string[] | null;
  admin_notes: string | null;
  response: string | null;
  responded_at: string | null;
  created_at: string;
  last_updated_at: string | null;
}

interface SupportRequestTableRow {
  id: string;
  user_id: string | null;
  email: string | null;
  phone_e164: string | null;
  subject: string;
  message: string;
  locale: string | null;
  status: string | null;
  priority: string | null;
  tags: string[] | null;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  last_updated_at: string | null;
}

interface WebhookDeliveryLogRow {
  id: string;
  provider: string;
  event_name: string | null;
  external_id: string | null;
  status: "processed" | "failed" | "rejected" | string;
  http_status: number | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date = new Date()) {
  const dayStart = startOfUtcDay(date);
  const dayOfWeek = dayStart.getUTCDay();
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return subtractUtcDays(dayStart, offset);
}

function createUtcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

function subtractUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function roundPercentage(value: number) {
  return Math.round(value * 10) / 10;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundRatio(value: number) {
  return Math.round(value * 10) / 10;
}

function roundMicroMoney(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createDailyCountMap(days: number, end = startOfUtcDay()) {
  const map = new Map<string, number>();

  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const day = subtractUtcDays(end, days - 1 - dayIndex);
    map.set(getUtcDateKey(day), 0);
  }

  return map;
}

function toChartPoints(map: Map<string, number>) {
  return Array.from(map.entries()).map(([date, count]) => ({
    date,
    label: formatShortDate(new Date(`${date}T00:00:00.000Z`)),
    count: roundMoney(count),
  }));
}

function incrementDailyCount(
  map: Map<string, number>,
  createdAt: string,
  amount = 1
) {
  const key = createdAt.slice(0, 10);

  if (!map.has(key)) {
    return;
  }

  map.set(key, (map.get(key) ?? 0) + amount);
}

function getDistinctDayCount(values: string[]) {
  return new Set(values.map((value) => value.slice(0, 10))).size;
}

function getHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function getMinuteKey(value: string) {
  return value.slice(0, 16);
}

function isPaidStatus(status: string | null | undefined) {
  return status === "active" || status === "cancelled" || status === "past_due";
}

function getCountryFromTimezone(timezone: string | null | undefined) {
  if (!timezone) {
    return null;
  }

  const normalized = timezone.trim();
  const map: Record<string, string> = {
    "Africa/Cairo": "Egypt",
    "Asia/Amman": "Jordan",
    "Asia/Bahrain": "Bahrain",
    "Asia/Beirut": "Lebanon",
    "Asia/Baghdad": "Iraq",
    "Asia/Dubai": "United Arab Emirates",
    "Asia/Jerusalem": "Israel",
    "Asia/Kuwait": "Kuwait",
    "Asia/Muscat": "Oman",
    "Asia/Qatar": "Qatar",
    "Asia/Riyadh": "Saudi Arabia",
    "Asia/Tehran": "Iran",
    "Asia/Tokyo": "Japan",
    "Europe/Amsterdam": "Netherlands",
    "Europe/Berlin": "Germany",
    "Europe/London": "United Kingdom",
    "Europe/Madrid": "Spain",
    "Europe/Paris": "France",
    "Europe/Rome": "Italy",
    "America/Chicago": "United States",
    "America/Los_Angeles": "United States",
    "America/New_York": "United States",
    "America/Toronto": "Canada",
  };

  return map[normalized] ?? null;
}

function getCountryFromPhone(phone: string | null | undefined) {
  if (!phone) {
    return null;
  }

  const normalized = phone.replace(/\s+/g, "");
  const prefixes: Array<[string, string]> = [
    ["+966", "Saudi Arabia"],
    ["+971", "United Arab Emirates"],
    ["+974", "Qatar"],
    ["+973", "Bahrain"],
    ["+965", "Kuwait"],
    ["+968", "Oman"],
    ["+962", "Jordan"],
    ["+961", "Lebanon"],
    ["+20", "Egypt"],
    ["+44", "United Kingdom"],
    ["+33", "France"],
    ["+49", "Germany"],
    ["+34", "Spain"],
    ["+39", "Italy"],
    ["+1", "United States"],
  ];

  const match = prefixes.find(([prefix]) => normalized.startsWith(prefix));
  return match?.[1] ?? null;
}

function resolveCountry(phone: string | null | undefined, timezone: string | null | undefined) {
  return getCountryFromPhone(phone) ?? getCountryFromTimezone(timezone) ?? "Unknown";
}

function normalizeFeedbackType(value: string | null | undefined): AdminFeedbackType {
  if (
    value === "bug" ||
    value === "feature" ||
    value === "complaint" ||
    value === "praise" ||
    value === "support"
  ) {
    return value;
  }

  return "support";
}

function normalizeFeedbackStatus(value: string | null | undefined): AdminFeedbackStatus {
  if (
    value === "new" ||
    value === "in_progress" ||
    value === "resolved" ||
    value === "closed"
  ) {
    return value;
  }

  if (value === "pending") {
    return "new";
  }

  if (value === "reviewed") {
    return "in_progress";
  }

  if (value === "rejected") {
    return "closed";
  }

  return "new";
}

function normalizeFeedbackPriority(value: string | null | undefined): AdminInboxPriority {
  if (
    value === "low" ||
    value === "normal" ||
    value === "high" ||
    value === "critical"
  ) {
    return value;
  }

  if (value === "medium") {
    return "normal";
  }

  return "normal";
}

function normalizeSupportStatus(value: string | null | undefined): AdminSupportStatus {
  if (
    value === "new" ||
    value === "in_progress" ||
    value === "resolved" ||
    value === "closed"
  ) {
    return value;
  }

  return "new";
}

function normalizeLocale(value: string | null | undefined) {
  return value === "ar" ? "ar" : "en";
}

function calculateTrend(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return roundPercentage(((current - previous) / previous) * 100);
}

function resolvePlanType(plan: string | null | undefined, trialExpiresAt: string | null | undefined): AdminPlanType {
  const tierKey = getTierKey(plan, trialExpiresAt);

  if (tierKey === "trial" || tierKey === "monthly" || tierKey === "annual" || tierKey === "founder") {
    return tierKey;
  }

  return "free";
}

function getRevenueForPlan(planType: string | null | undefined) {
  if (planType === "monthly" || planType === "annual" || planType === "founder") {
    return PLAN_PRICES[planType];
  }

  return 0;
}

function isPaidPlanType(planType: string | null | undefined): planType is "monthly" | "annual" | "founder" {
  return planType === "monthly" || planType === "annual" || planType === "founder";
}

function isRevenueActiveSubscription(subscription: SubscriptionRow, now = new Date()) {
  if (!isPaidPlanType(subscription.plan_type)) {
    return false;
  }

  if (subscription.status === "active") {
    return true;
  }

  if (
    subscription.status === "cancelled" &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end) > now
  ) {
    return true;
  }

  return false;
}

function isRevenueActiveSubscriptionAt(subscription: SubscriptionRow, at: Date) {
  if (!isPaidPlanType(subscription.plan_type)) {
    return false;
  }

  if (new Date(subscription.created_at) > at) {
    return false;
  }

  if (subscription.status === "active") {
    return true;
  }

  const updatedAt = new Date(subscription.updated_at ?? subscription.created_at);

  if (subscription.status === "cancelled") {
    if (subscription.current_period_end) {
      return new Date(subscription.current_period_end) > at;
    }

    return updatedAt > at;
  }

  if (subscription.status === "expired") {
    return updatedAt > at;
  }

  return false;
}

function getSubscriptionMrrValue(planType: SubscriptionRow["plan_type"]) {
  if (planType === "monthly") {
    return PLAN_PRICES.monthly;
  }

  if (planType === "annual") {
    return PLAN_PRICES.annual / 12;
  }

  if (planType === "founder") {
    return PLAN_PRICES.founder / 12;
  }

  return 0;
}

function getEstimatedPlatformFee(planType: "monthly" | "annual" | "founder") {
  const gross = getRevenueForPlan(planType);
  const feeRate =
    planType === "founder"
      ? LEMON_PLATFORM_FEE_RATE
      : LEMON_PLATFORM_FEE_RATE + LEMON_SUBSCRIPTION_FEE_RATE;

  return roundMoney((gross * feeRate) + LEMON_FIXED_FEE_USD);
}

function getEstimatedPayoutDateForSale(createdAt: string) {
  const saleDate = new Date(createdAt);
  const year = saleDate.getUTCFullYear();
  const month = saleDate.getUTCMonth();
  const day = saleDate.getUTCDate();

  if (day <= 14) {
    return createUtcDate(year, month, 28);
  }

  return createUtcDate(year, month + 1, 14);
}

function getNextPayoutDate(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  if (day <= 14) {
    return createUtcDate(year, month, 14);
  }

  if (day <= 28) {
    return createUtcDate(year, month, 28);
  }

  return createUtcDate(year, month + 1, 14);
}

function getBatchCreatedAt(payoutDate: Date) {
  return createUtcDate(
    payoutDate.getUTCFullYear(),
    payoutDate.getUTCMonth(),
    payoutDate.getUTCDate() === 14 ? 1 : 15
  );
}

function getRangeCount(rows: Array<{ created_at: string }>, daysInclusive: number) {
  const threshold = subtractUtcDays(startOfUtcDay(), Math.max(daysInclusive - 1, 0)).getTime();

  return rows.reduce((count, row) => {
    const createdAt = new Date(row.created_at).getTime();
    return createdAt >= threshold ? count + 1 : count;
  }, 0);
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>
) {
  const rows: T[] = [];

  for (let from = 0; ; from += TABLE_PAGE_SIZE) {
    const batch = await fetchPage(from, from + TABLE_PAGE_SIZE - 1);
    rows.push(...batch);

    if (batch.length < TABLE_PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

async function fetchProfiles() {
  const admin = createAdminClient();

  return fetchAllRows<ProfileRow>(async (from, to) => {
    const { data, error } = await admin
      .from("profiles")
      .select("id, full_name, plan, trial_expires_at, created_at")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Could not read profiles: ${error.message}`);
    }

    return (data ?? []) as ProfileRow[];
  });
}

async function fetchSummaries() {
  const admin = createAdminClient();

  return fetchAllRows<SummaryRow>(async (from, to) => {
    const { data, error } = await admin
      .from("summaries")
      .select("user_id, created_at")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Could not read summaries: ${error.message}`);
    }

    return (data ?? []) as SummaryRow[];
  });
}

async function fetchSubscriptions() {
  const admin = createAdminClient();

  return fetchAllRows<SubscriptionRow>(async (from, to) => {
    const { data, error } = await admin
      .from("subscriptions")
      .select(
        "user_id, plan_type, status, current_period_end, created_at, updated_at, ls_subscription_id, ls_order_id"
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Could not read subscriptions: ${error.message}`);
    }

    return (data ?? []) as SubscriptionRow[];
  });
}

async function fetchMarketingSpend() {
  const admin = createAdminClient();

  try {
    return await fetchAllRows<MarketingSpendRow>(async (from, to) => {
      const { data, error } = await admin
        .from("marketing_spend")
        .select("id, month, channel, amount, notes, created_at")
        .order("month", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Could not read marketing spend: ${error.message}`);
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        month: row.month,
        channel: row.channel ?? "organic",
        amount: Number(row.amount ?? 0),
        notes: row.notes ?? null,
        created_at: row.created_at,
      }));
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("marketing_spend") || error.message.includes("relation"))
    ) {
      return [];
    }

    throw error;
  }
}

async function fetchRecentSubscriptions(limit: number) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select(
      "user_id, plan_type, status, current_period_end, created_at, updated_at, ls_subscription_id, ls_order_id"
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Could not read recent subscriptions: ${error.message}`);
  }

  return (data ?? []) as SubscriptionRow[];
}

async function fetchAuthUsers() {
  const admin = createAdminClient();
  const users: AuthUserRow[] = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    });

    if (error) {
      throw new Error(`Could not read auth users: ${error.message}`);
    }

    const batch = data.users.map((user) => ({
      id: user.id,
      email: user.email ?? null,
      phone: user.phone ?? null,
      fullName:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : null,
      bannedUntil: user.banned_until ?? null,
    }));

    users.push(...batch);

    if (data.users.length < AUTH_PAGE_SIZE) {
      break;
    }
  }

  return users;
}

async function fetchAiRequestLogs() {
  const admin = createAdminClient();

  try {
    return await fetchAllRows<AiRequestLogRow>(async (from, to) => {
      const { data, error } = await admin
        .from("ai_request_logs")
        .select(
          "id, user_id, model, status, error_code, input_chars, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, created_at"
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Could not read ai_request_logs: ${error.message}`);
      }

      return (data ?? []) as AiRequestLogRow[];
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("ai_request_logs") || error.message.includes("relation"))
    ) {
      return [];
    }

    throw error;
  }
}

async function fetchUserConsents() {
  const admin = createAdminClient();

  try {
    return await fetchAllRows<UserConsentRow>(async (from, to) => {
      const { data, error } = await admin
        .from("user_consents")
        .select("user_id, ip_address, analytics, session_replay, marketing, withdrawn_at, created_at")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Could not read user_consents: ${error.message}`);
      }

      return (data ?? []) as UserConsentRow[];
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("user_consents") || error.message.includes("relation"))
    ) {
      return [];
    }

    throw error;
  }
}

async function fetchPushSubscriptions() {
  const admin = createAdminClient();

  try {
    return await fetchAllRows<PushSubscriptionRow>(async (from, to) => {
      const { data, error } = await admin
        .from("push_subscriptions")
        .select("user_id, timezone, last_notified_at, last_error, created_at")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Could not read push_subscriptions: ${error.message}`);
      }

      return (data ?? []) as PushSubscriptionRow[];
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("push_subscriptions") || error.message.includes("relation"))
    ) {
      return [];
    }

    throw error;
  }
}

async function fetchFeedbackRows() {
  const admin = createAdminClient();

  try {
    return await fetchAllRows<FeedbackRowModern>(async (from, to) => {
      const { data, error } = await admin
        .from("user_feedback")
        .select(
          "id, user_id, email, phone_e164, subject, locale, type, status, priority, message, rating, tags, admin_notes, response, responded_at, created_at, last_updated_at"
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Could not read user_feedback: ${error.message}`);
      }

      return (data ?? []) as FeedbackRowModern[];
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("column") || error.message.includes("schema cache"))
    ) {
      const legacyRows = await fetchAllRows<FeedbackRowLegacy>(async (from, to) => {
        const { data, error: legacyError } = await admin
          .from("user_feedback")
          .select("id, phone_e164, message, meta_json, created_at")
          .order("created_at", { ascending: false })
          .range(from, to);

        if (legacyError) {
          throw new Error(`Could not read legacy user_feedback: ${legacyError.message}`);
        }

        return (data ?? []) as FeedbackRowLegacy[];
      });

      return legacyRows.map((row) => ({
        id: row.id,
        user_id: null,
        email:
          typeof row.meta_json?.email === "string" ? row.meta_json.email : null,
        phone_e164: row.phone_e164,
        subject:
          typeof row.meta_json?.subject === "string"
            ? row.meta_json.subject
            : row.message.slice(0, 96),
        locale:
          typeof row.meta_json?.locale === "string" ? row.meta_json.locale : "en",
        type: typeof row.meta_json?.type === "string" ? row.meta_json.type : "support",
        status: typeof row.meta_json?.status === "string" ? row.meta_json.status : "pending",
        priority:
          typeof row.meta_json?.priority === "string" ? row.meta_json.priority : "medium",
        message: row.message,
        rating:
          typeof row.meta_json?.rating === "string" ? row.meta_json.rating : null,
        tags:
          Array.isArray(row.meta_json?.tags)
            ? row.meta_json.tags.filter((tag): tag is string => typeof tag === "string")
            : typeof row.meta_json?.source === "string"
              ? [row.meta_json.source]
              : [],
        admin_notes:
          typeof row.meta_json?.admin_notes === "string" ? row.meta_json.admin_notes : null,
        response: null,
        responded_at: null,
        created_at: row.created_at,
        last_updated_at: row.created_at,
      }));
    }

    if (
      error instanceof Error &&
      (error.message.includes("user_feedback") || error.message.includes("relation"))
    ) {
      return [];
    }

    throw error;
  }
}

async function fetchSupportRequests() {
  const admin = createAdminClient();

  try {
    return await fetchAllRows<SupportRequestTableRow>(async (from, to) => {
      const { data, error } = await admin
        .from("support_requests")
        .select(
          "id, user_id, email, phone_e164, subject, message, locale, status, priority, tags, admin_notes, resolved_at, created_at, last_updated_at"
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Could not read support_requests: ${error.message}`);
      }

      return (data ?? []) as SupportRequestTableRow[];
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("support_requests") || error.message.includes("relation"))
    ) {
      return [];
    }

    throw error;
  }
}

async function fetchWebhookDeliveryLogs() {
  const admin = createAdminClient();

  try {
    return await fetchAllRows<WebhookDeliveryLogRow>(async (from, to) => {
      const { data, error } = await admin
        .from("webhook_delivery_log")
        .select(
          "id, provider, event_name, external_id, status, http_status, error_code, error_message, created_at"
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Could not read webhook_delivery_log: ${error.message}`);
      }

      return (data ?? []) as WebhookDeliveryLogRow[];
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("webhook_delivery_log") || error.message.includes("relation"))
    ) {
      return [];
    }

    throw error;
  }
}

function createAuthUserMap(users: AuthUserRow[]) {
  return new Map(users.map((user) => [user.id, user]));
}

function isOpenFeedbackStatus(status: AdminFeedbackStatus) {
  return status === "new" || status === "in_progress";
}

function isOpenSupportStatus(status: AdminSupportStatus) {
  return status === "new" || status === "in_progress";
}

function collectTagOptions(rows: Array<{ tags: string[] }>) {
  return Array.from(
    new Set(
      rows.flatMap((row) =>
        row.tags
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      )
    )
  ).sort((left, right) => left.localeCompare(right));
}

function mapFeedbackRow(
  row: FeedbackRowModern,
  authUsersById: Map<string, AuthUserRow>
): AdminFeedbackRow {
  const authUser = row.user_id ? authUsersById.get(row.user_id) : null;

  return {
    id: row.id,
    userId: row.user_id,
    email: row.email ?? authUser?.email ?? null,
    phone: row.phone_e164 ?? authUser?.phone ?? null,
    type: normalizeFeedbackType(row.type),
    status: normalizeFeedbackStatus(row.status),
    priority: normalizeFeedbackPriority(row.priority),
    locale: normalizeLocale(row.locale),
    subject: row.subject?.trim() || row.message.slice(0, 96),
    message: row.message,
    rating: row.rating ?? null,
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
    adminNotes: row.admin_notes ?? null,
    response: row.response ?? null,
    respondedAt: row.responded_at ?? null,
    createdAt: row.created_at,
    lastUpdatedAt: row.last_updated_at ?? row.responded_at ?? row.created_at,
  };
}

function mapSupportRequestRow(row: SupportRequestTableRow): AdminSupportRequestRow {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email ?? null,
    phone: row.phone_e164 ?? null,
    status: normalizeSupportStatus(row.status),
    priority: normalizeFeedbackPriority(row.priority),
    locale: normalizeLocale(row.locale),
    subject: row.subject,
    message: row.message,
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
    adminNotes: row.admin_notes ?? null,
    resolvedAt: row.resolved_at ?? null,
    createdAt: row.created_at,
    lastUpdatedAt: row.last_updated_at ?? row.resolved_at ?? row.created_at,
  };
}

function mapWebhookDeliveryRow(row: WebhookDeliveryLogRow): AdminWebhookDeliveryRow {
  return {
    id: row.id,
    provider: row.provider,
    eventName: row.event_name,
    externalId: row.external_id,
    status:
      row.status === "failed" || row.status === "rejected" ? row.status : "processed",
    httpStatus: row.http_status ?? null,
    errorCode: row.error_code ?? null,
    errorMessage: row.error_message ?? null,
    createdAt: row.created_at,
  };
}

export async function getAdminOverviewMetrics(): Promise<AdminOverviewMetrics> {
  const [
    profiles,
    summaries,
    subscriptions,
    marketingSpend,
    authUsers,
    pushSubscriptions,
    userConsents,
    aiRequestLogs,
    feedbackRows,
    supportRows,
    webhookRows,
  ] = await Promise.all([
    fetchProfiles(),
    fetchSummaries(),
    fetchSubscriptions(),
    fetchMarketingSpend(),
    fetchAuthUsers(),
    fetchPushSubscriptions(),
    fetchUserConsents(),
    fetchAiRequestLogs(),
    fetchFeedbackRows(),
    fetchSupportRequests(),
    fetchWebhookDeliveryLogs(),
  ]);
  const totalAccounts = profiles.length;
  const authUsersById = createAuthUserMap(authUsers);
  const pushSubscriptionByUserId = new Map<string, PushSubscriptionRow>();
  const onboardedUserIds = new Set(summaries.map((summary) => summary.user_id));
  const todayStart = startOfUtcDay();
  const previousDayStart = subtractUtcDays(todayStart, 1);
  const chartStart = subtractUtcDays(todayStart, 13);
  const last7WindowStart = subtractUtcDays(todayStart, 6);
  const currentWindowStart = subtractUtcDays(todayStart, 29);
  const previousWindowStart = subtractUtcDays(todayStart, 59);
  const monthStart = createUtcDate(
    todayStart.getUTCFullYear(),
    todayStart.getUTCMonth(),
    1
  );
  const last24HoursThreshold = Date.now() - (24 * 60 * 60 * 1000);
  const churnWindowStart = currentWindowStart.getTime();
  const previousChurnWindowStart = previousWindowStart.getTime();
  const dailyActiveThreshold = todayStart.getTime();
  const previousDailyActiveThreshold = previousDayStart.getTime();
  const monthlyActiveThreshold = currentWindowStart.getTime();
  const chartCounts = new Map<string, number>();
  const signupTrend = createDailyCountMap(7, todayStart);
  const summaryTrend = createDailyCountMap(7, todayStart);
  const spendTrend = createDailyCountMap(7, todayStart);
  const tokenTrend = createDailyCountMap(7, todayStart);
  const summaryTrend30Days = createDailyCountMap(30, todayStart);
  const aiSpendTrend30Days = createDailyCountMap(30, todayStart);
  const collectionTrend = createDailyCountMap(14, todayStart);
  const mrrMomentum = createDailyCountMap(7, todayStart);
  const dailyActiveUserIds = new Set<string>();
  const previousDailyActiveUserIds = new Set<string>();
  const weeklyActiveUserIds = new Set<string>();
  const monthlyActiveUserIds = new Set<string>();
  const activeUsersByDay = new Map<string, Set<string>>();
  const firstSummaryByUserId = new Map<string, string>();
  const summaryDatesByUserId = new Map<string, string[]>();
  const peakHourCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  const payingUserIds = new Set<string>();
  const retainedPaidUserIds = new Set<string>();
  const atRiskUserIds = new Set<string>();
  const visitorProxyIds = new Set<string>();
  const planDistribution = new Map<"monthly" | "annual" | "founder", { purchases: number; estimatedRevenue: number }>();

  planDistribution.set("monthly", { purchases: 0, estimatedRevenue: 0 });
  planDistribution.set("annual", { purchases: 0, estimatedRevenue: 0 });
  planDistribution.set("founder", { purchases: 0, estimatedRevenue: 0 });

  for (const row of pushSubscriptions) {
    if (!pushSubscriptionByUserId.has(row.user_id)) {
      pushSubscriptionByUserId.set(row.user_id, row);
    }
  }

  for (let dayIndex = 0; dayIndex < 14; dayIndex += 1) {
    const day = subtractUtcDays(todayStart, 13 - dayIndex);
    chartCounts.set(day.toISOString().slice(0, 10), 0);
  }

  for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
    const day = subtractUtcDays(todayStart, 29 - dayIndex);
    activeUsersByDay.set(day.toISOString().slice(0, 10), new Set<string>());
  }

  let freeUsers = 0;
  let trialUsers = 0;
  let paidUsers = 0;
  let founderUsers = 0;
  let paidPlanUsers = 0;
  let trialStartedUsers = 0;
  let convertedTrialUsers = 0;
  let currentNewCustomers = 0;
  let previousNewCustomers = 0;

  for (const profile of profiles) {
    const authUser = authUsersById.get(profile.id);
    const pushSubscription = pushSubscriptionByUserId.get(profile.id);
    const planType = resolvePlanType(profile.plan, profile.trial_expires_at);
    const country = resolveCountry(authUser?.phone, pushSubscription?.timezone);

    countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);

    if (planType === "founder") {
      founderUsers += 1;
      paidPlanUsers += 1;
    } else if (planType === "monthly" || planType === "annual") {
      paidUsers += 1;
      paidPlanUsers += 1;
    } else if (planType === "trial") {
      trialUsers += 1;
      freeUsers += 1;
    } else {
      freeUsers += 1;
    }

    if (profile.trial_expires_at) {
      trialStartedUsers += 1;
      if (planType === "monthly" || planType === "annual" || planType === "founder") {
        convertedTrialUsers += 1;
      }
    }

    const createdAt = new Date(profile.created_at);
    if (createdAt >= chartStart) {
      const key = createdAt.toISOString().slice(0, 10);
      chartCounts.set(key, (chartCounts.get(key) ?? 0) + 1);
    }

    if (createdAt >= last7WindowStart) {
      incrementDailyCount(signupTrend, profile.created_at);
    }

    const createdAtMs = createdAt.getTime();
    if (createdAtMs >= currentWindowStart.getTime()) {
      currentNewCustomers += 1;
    } else if (createdAtMs >= previousWindowStart.getTime()) {
      previousNewCustomers += 1;
    }
  }

  const onboarded = onboardedUserIds.size;
  for (const summary of summaries) {
    const currentDates = summaryDatesByUserId.get(summary.user_id) ?? [];
    currentDates.push(summary.created_at);
    summaryDatesByUserId.set(summary.user_id, currentDates);

    const existingFirstSummary = firstSummaryByUserId.get(summary.user_id);
    if (!existingFirstSummary || new Date(existingFirstSummary) > new Date(summary.created_at)) {
      firstSummaryByUserId.set(summary.user_id, summary.created_at);
    }

    const createdAt = new Date(summary.created_at).getTime();

    if (createdAt >= dailyActiveThreshold) {
      dailyActiveUserIds.add(summary.user_id);
    }

    if (createdAt >= previousDailyActiveThreshold && createdAt < dailyActiveThreshold) {
      previousDailyActiveUserIds.add(summary.user_id);
    }

    if (createdAt >= last7WindowStart.getTime()) {
      weeklyActiveUserIds.add(summary.user_id);
    }

    if (createdAt >= monthlyActiveThreshold) {
      monthlyActiveUserIds.add(summary.user_id);
    }

    if (createdAt >= last7WindowStart.getTime()) {
      incrementDailyCount(summaryTrend, summary.created_at);
    }

    incrementDailyCount(summaryTrend30Days, summary.created_at);

    const dayKey = summary.created_at.slice(0, 10);
    const dayUsers = activeUsersByDay.get(dayKey);
    if (dayUsers) {
      dayUsers.add(summary.user_id);
    }

    const hourLabel = getHourLabel(new Date(summary.created_at).getUTCHours());
    peakHourCounts.set(hourLabel, (peakHourCounts.get(hourLabel) ?? 0) + 1);
  }

  let mrr = 0;
  let proMrr = 0;
  let founderMrr = 0;
  let revenueMtdUsd = 0;
  let activeSubscriptions = 0;
  let cancellations = 0;
  let previousCancellations = 0;
  let pastDueCount = 0;
  let payoutEstimatedGross = 0;
  let payoutEstimatedPlatformFees = 0;
  const nextPayoutAt = getNextPayoutDate();
  const nextPayoutKey = nextPayoutAt.toISOString().slice(0, 10);

  for (const subscription of subscriptions) {
    if (
      isPaidPlanType(subscription.plan_type) &&
      isPaidStatus(subscription.status)
    ) {
      payingUserIds.add(subscription.user_id);
    }

    if (subscription.status === "past_due") {
      pastDueCount += 1;
      atRiskUserIds.add(subscription.user_id);
    }

    if (
      subscription.status === "cancelled" &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end).getTime() <= addUtcDays(todayStart, 14).getTime()
    ) {
      atRiskUserIds.add(subscription.user_id);
    }

    if (isRevenueActiveSubscription(subscription)) {
      activeSubscriptions += 1;

      if (subscription.plan_type === "monthly") {
        mrr += PLAN_PRICES.monthly;
        proMrr += PLAN_PRICES.monthly;
      } else if (subscription.plan_type === "annual") {
        const annualMrr = PLAN_PRICES.annual / 12;
        mrr += annualMrr;
        proMrr += annualMrr;
      } else if (subscription.plan_type === "founder") {
        const founderSeatMrr = PLAN_PRICES.founder / 12;
        mrr += founderSeatMrr;
        founderMrr += founderSeatMrr;
      }
    }

    if (isPaidPlanType(subscription.plan_type)) {
      const amount = getRevenueForPlan(subscription.plan_type);
      const planMetrics = planDistribution.get(subscription.plan_type);

      if (planMetrics) {
        planMetrics.purchases += 1;
        planMetrics.estimatedRevenue += amount;
      }

      incrementDailyCount(collectionTrend, subscription.created_at, amount);

      if (new Date(subscription.created_at) >= monthStart) {
        revenueMtdUsd += amount;
      }

      if (getEstimatedPayoutDateForSale(subscription.created_at).toISOString().slice(0, 10) === nextPayoutKey) {
        payoutEstimatedGross += amount;
        payoutEstimatedPlatformFees += getEstimatedPlatformFee(subscription.plan_type);
      }
    }

    const updatedAt = new Date(subscription.updated_at ?? subscription.created_at).getTime();
    if (
      (subscription.status === "cancelled" || subscription.status === "expired") &&
      updatedAt >= churnWindowStart
    ) {
      cancellations += 1;
    } else if (
      (subscription.status === "cancelled" || subscription.status === "expired") &&
      updatedAt >= previousChurnWindowStart &&
      updatedAt < churnWindowStart
    ) {
      previousCancellations += 1;
    }
  }

  for (const userId of payingUserIds) {
    if (monthlyActiveUserIds.has(userId)) {
      retainedPaidUserIds.add(userId);
    }
  }

  const previousMrr = roundMoney(
    subscriptions.reduce((total, subscription) => {
      if (!isRevenueActiveSubscriptionAt(subscription, currentWindowStart)) {
        return total;
      }

      return total + getSubscriptionMrrValue(subscription.plan_type);
    }, 0)
  );
  const previousActiveSubscriptions = subscriptions.reduce((total, subscription) => {
    return isRevenueActiveSubscriptionAt(subscription, currentWindowStart)
      ? total + 1
      : total;
  }, 0);

  for (const [date] of mrrMomentum.entries()) {
    const dayEnd = addUtcDays(new Date(`${date}T00:00:00.000Z`), 1);
    const dayMrr = subscriptions.reduce((total, subscription) => {
      if (!isRevenueActiveSubscriptionAt(subscription, dayEnd)) {
        return total;
      }

      return total + getSubscriptionMrrValue(subscription.plan_type);
    }, 0);

    mrrMomentum.set(date, roundMoney(dayMrr));
  }
  const arr = mrr * 12;
  const arpu = paidPlanUsers === 0 ? 0 : mrr / paidPlanUsers;
  const activationRate =
    totalAccounts === 0 ? 0 : roundPercentage((onboarded / totalAccounts) * 100);
  const conversionRate =
    totalAccounts === 0 ? 0 : roundPercentage((paidPlanUsers / totalAccounts) * 100);
  const trialConversion =
    trialStartedUsers === 0 ? 0 : roundPercentage((convertedTrialUsers / trialStartedUsers) * 100);
  const founderCapacity = 200;
  const dau = dailyActiveUserIds.size;
  const previousDau = previousDailyActiveUserIds.size;
  const mau = monthlyActiveUserIds.size;
  const dauMauRatio = mau === 0 ? 0 : roundPercentage((dau / mau) * 100);
  const churnRate =
    activeSubscriptions === 0 ? 0 : roundPercentage((cancellations / activeSubscriptions) * 100);
  const previousChurnRate =
    previousActiveSubscriptions === 0
      ? 0
      : roundPercentage((previousCancellations / previousActiveSubscriptions) * 100);
  const mrrTrend = calculateTrend(mrr, previousMrr);
  const dauTrend = calculateTrend(dau, previousDau);
  const churnTrend = calculateTrend(churnRate, previousChurnRate);
  const currentSpendRows = marketingSpend.filter((row) => {
    const monthTime = new Date(`${row.month}T00:00:00.000Z`).getTime();
    return monthTime >= currentWindowStart.getTime();
  });
  const previousSpendRows = marketingSpend.filter((row) => {
    const monthTime = new Date(`${row.month}T00:00:00.000Z`).getTime();
    return monthTime >= previousWindowStart.getTime() && monthTime < currentWindowStart.getTime();
  });
  const totalSpend = roundMoney(
    currentSpendRows.reduce((sum, row) => sum + Number(row.amount), 0)
  );
  const previousSpend = roundMoney(
    previousSpendRows.reduce((sum, row) => sum + Number(row.amount), 0)
  );
  const cac = currentNewCustomers === 0 ? 0 : roundMoney(totalSpend / currentNewCustomers);
  const previousCac =
    previousNewCustomers === 0 ? 0 : roundMoney(previousSpend / previousNewCustomers);
  const cacTrend = calculateTrend(cac, previousCac);
  const currentSpendByChannel = new Map<string, number>();

  for (const row of currentSpendRows) {
    const channel = row.channel?.trim() || "organic";
    currentSpendByChannel.set(channel, (currentSpendByChannel.get(channel) ?? 0) + row.amount);
  }

  const channels = Array.from(currentSpendByChannel.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([channel, amount]) => ({
      channel,
      amount: roundMoney(amount),
      percentage: totalSpend === 0 ? 0 : roundPercentage((amount / totalSpend) * 100),
    }));
  const avgLifespanMonths = churnRate > 0 ? roundRatio(100 / churnRate) : 24;
  const ltv = roundMoney(arpu * avgLifespanMonths);
  const ltvToCacRatio = cac > 0 ? roundRatio(ltv / cac) : 0;
  const returningUsers = Array.from(summaryDatesByUserId.values()).filter((dates) => {
    const recentDates = dates.filter(
      (value) => new Date(value).getTime() >= currentWindowStart.getTime()
    );

    return getDistinctDayCount(recentDates) >= 2;
  }).length;
  const returningRate = mau === 0 ? 0 : roundPercentage((returningUsers / mau) * 100);
  const timeToFirstValueHours = roundRatio(
    average(
      profiles.flatMap((profile) => {
        const firstSummary = firstSummaryByUserId.get(profile.id);

        if (!firstSummary) {
          return [];
        }

        const deltaHours =
          (new Date(firstSummary).getTime() - new Date(profile.created_at).getTime()) /
          (1000 * 60 * 60);

        return deltaHours >= 0 ? [deltaHours] : [];
      })
    )
  );
  const retentionRate =
    payingUserIds.size === 0
      ? 0
      : roundPercentage((retainedPaidUserIds.size / payingUserIds.size) * 100);
  const cohortRetention = Array.from({ length: 6 }).map((_, index) => {
    const cohortStart = subtractUtcDays(startOfUtcWeek(todayStart), (5 - index) * 7);
    const cohortEnd = addUtcDays(cohortStart, 7);
    const cohortProfiles = profiles.filter((profile) => {
      const createdAt = new Date(profile.created_at);
      return createdAt >= cohortStart && createdAt < cohortEnd;
    });
    const retainedCount = cohortProfiles.filter((profile) => {
      const dates = summaryDatesByUserId.get(profile.id) ?? [];

      return dates.some((value) => {
        return (
          new Date(value).getTime() >=
          addUtcDays(new Date(profile.created_at), 7).getTime()
        );
      });
    }).length;

    return {
      date: cohortStart.toISOString(),
      label: formatShortDate(cohortStart),
      count:
        cohortProfiles.length === 0
          ? 0
          : roundPercentage((retainedCount / cohortProfiles.length) * 100),
    };
  });

  const activeConsentRows = userConsents.filter((row) => row.withdrawn_at === null);
  for (const row of activeConsentRows) {
    visitorProxyIds.add(row.user_id ?? row.ip_address ?? row.created_at);
  }

  const aiSuccessLogs = aiRequestLogs.filter((row) => row.status === "success");
  const aiErrorLogs = aiRequestLogs.filter((row) => row.status === "error");
  const aiSuccessLogsLast7Days = aiSuccessLogs.filter(
    (row) => new Date(row.created_at).getTime() >= last7WindowStart.getTime()
  );
  const aiErrorLogsLast7Days = aiErrorLogs.filter(
    (row) => new Date(row.created_at).getTime() >= last7WindowStart.getTime()
  );
  const aiErrorLogsLast24Hours = aiErrorLogs.filter(
    (row) => new Date(row.created_at).getTime() >= last24HoursThreshold
  );

  for (const row of aiSuccessLogsLast7Days) {
    incrementDailyCount(spendTrend, row.created_at, Number(row.estimated_cost_usd ?? 0));
    incrementDailyCount(tokenTrend, row.created_at, Number(row.total_tokens ?? 0));
  }

  for (const row of aiSuccessLogs) {
    incrementDailyCount(aiSpendTrend30Days, row.created_at, Number(row.estimated_cost_usd ?? 0));
  }

  const requestsToday = aiSuccessLogs.filter(
    (row) => new Date(row.created_at).getTime() >= dailyActiveThreshold
  ).length;
  const tokensToday = aiSuccessLogs
    .filter((row) => new Date(row.created_at).getTime() >= dailyActiveThreshold)
    .reduce((sum, row) => sum + Number(row.total_tokens ?? 0), 0);
  const spendLast7Days = roundMoney(
    aiSuccessLogsLast7Days.reduce((sum, row) => sum + Number(row.estimated_cost_usd ?? 0), 0)
  );
  const costPerSummary =
    aiSuccessLogsLast7Days.length === 0
      ? 0
      : roundMicroMoney(spendLast7Days / aiSuccessLogsLast7Days.length);
  const errorRate =
    aiSuccessLogsLast7Days.length + aiErrorLogsLast7Days.length === 0
      ? 0
      : roundPercentage(
          (aiErrorLogsLast7Days.length /
            (aiSuccessLogsLast7Days.length + aiErrorLogsLast7Days.length)) *
            100
        );
  const avgLatencyMs = roundMoney(
    average(aiSuccessLogsLast7Days.map((row) => Number(row.latency_ms ?? 0)))
  );
  const aiModel =
    aiRequestLogs[0]?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const mappedFeedback = feedbackRows.map((row) => mapFeedbackRow(row, authUsersById));
  const feedbackItems = mappedFeedback.filter((row) => row.type !== "support");
  const supportItems =
    supportRows.length > 0
      ? supportRows.map((row) => mapSupportRequestRow(row))
      : mappedFeedback
          .filter((row) => row.type === "support")
          .map((row) => ({
            id: row.id,
            userId: row.userId,
            email: row.email,
            phone: row.phone,
            status: row.status,
            priority: row.priority,
            locale: row.locale,
            subject: row.subject,
            message: row.message,
            tags: row.tags,
            adminNotes: row.adminNotes,
            resolvedAt: row.respondedAt,
            createdAt: row.createdAt,
            lastUpdatedAt: row.lastUpdatedAt,
          }));
  const webhookItems = webhookRows.map((row) => mapWebhookDeliveryRow(row));
  const criticalFeedback = feedbackItems.filter((row) => {
    return row.priority === "critical" && row.status !== "resolved";
  }).length;
  const notificationsSubscribedUsers = new Set(pushSubscriptions.map((row) => row.user_id)).size;
  const notificationsSentLast24Hours = pushSubscriptions.filter((row) => {
    return (
      row.last_notified_at !== null &&
      new Date(row.last_notified_at).getTime() >= last24HoursThreshold
    );
  }).length;
  const notificationsFailedLast24Hours = pushSubscriptions.filter(
    (row) => row.last_error
  ).length;
  const countryBreakdown = Array.from(countryCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([country, count]) => ({
      country,
      count,
      percentage: totalAccounts === 0 ? 0 : roundPercentage((count / totalAccounts) * 100),
    }));
  const payoutGrossRounded = roundMoney(payoutEstimatedGross);
  const payoutPlatformFeesRounded = roundMoney(payoutEstimatedPlatformFees);
  const payoutAfterPlatformFees = Math.max(payoutGrossRounded - payoutPlatformFeesRounded, 0);
  const payoutEstimatedFee = roundMoney(payoutAfterPlatformFees * NON_US_BANK_PAYOUT_FEE_RATE);
  const payoutEstimatedNet = roundMoney(Math.max(payoutAfterPlatformFees - payoutEstimatedFee, 0));
  const topSources = channels.slice(0, 4).map((channel) => ({
    label: channel.channel,
    count: channel.amount,
    percentage: channel.percentage,
  }));
  const featureUsage = [
    { label: "Summaries saved", count: summaries.length },
    { label: "Push opt-ins", count: notificationsSubscribedUsers },
    {
      label: "Analytics opt-ins",
      count: activeConsentRows.filter((row) => row.analytics).length,
    },
    { label: "Returning users", count: returningUsers },
  ];
  const peakHours = Array.from(peakHourCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([label, count]) => ({
      date: label,
      label,
      count,
    }));
  const recentSubscriptions = subscriptions
    .slice()
    .sort((left, right) => {
      const leftTime = new Date(left.updated_at ?? left.created_at).getTime();
      const rightTime = new Date(right.updated_at ?? right.created_at).getTime();

      return rightTime - leftTime;
    })
    .slice(0, 6)
    .map((subscription) => {
      const updatedAt = subscription.updated_at ?? subscription.created_at;
      const authUser = authUsersById.get(subscription.user_id);

      return {
        id: `${subscription.ls_subscription_id ?? subscription.ls_order_id ?? subscription.user_id}-${updatedAt}`,
        userId: subscription.user_id,
        email: authUser?.email ?? null,
        planType: subscription.plan_type ?? "unknown",
        status: subscription.status ?? "unknown",
        eventType:
          subscription.updated_at && subscription.updated_at !== subscription.created_at
            ? ("updated" as const)
            : ("created" as const),
        eventAt: updatedAt,
        createdAt: subscription.created_at,
        updatedAt: subscription.updated_at,
        reference:
          subscription.ls_subscription_id ??
          subscription.ls_order_id ??
          subscription.user_id,
      };
    });
  const summariesTodayCount = summaries.filter(
    (row) => new Date(row.created_at).getTime() >= dailyActiveThreshold
  ).length;
  const summariesLast7DaysCount = summaries.filter(
    (row) => new Date(row.created_at).getTime() >= last7WindowStart.getTime()
  ).length;
  const summariesLast30DaysCount = summaries.filter(
    (row) => new Date(row.created_at).getTime() >= currentWindowStart.getTime()
  ).length;
  const aiCostTodayUsd = roundMoney(
    aiSuccessLogs
      .filter((row) => new Date(row.created_at).getTime() >= dailyActiveThreshold)
      .reduce((sum, row) => sum + Number(row.estimated_cost_usd ?? 0), 0)
  );
  const aiCostLast30DaysUsd = roundMoney(
    aiSuccessLogs
      .filter((row) => new Date(row.created_at).getTime() >= currentWindowStart.getTime())
      .reduce((sum, row) => sum + Number(row.estimated_cost_usd ?? 0), 0)
  );
  const aiRequestsLast30Days = aiSuccessLogs.filter(
    (row) => new Date(row.created_at).getTime() >= currentWindowStart.getTime()
  ).length;
  const failedWebhookRowsLast7Days = webhookItems.filter((row) => {
    const createdAt = new Date(row.createdAt).getTime();
    return (
      createdAt >= last7WindowStart.getTime() &&
      (row.status === "failed" || row.status === "rejected")
    );
  });
  const dailySummaryAveragePreviousWeek = roundMoney(
    summaries.filter((row) => {
      const createdAt = new Date(row.created_at).getTime();
      return (
        createdAt >= subtractUtcDays(todayStart, 13).getTime() &&
        createdAt < last7WindowStart.getTime()
      );
    }).length / 7
  );
  const sentryConfigured = Boolean(
    process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
  );
  const attention: AdminOverviewMetrics["attention"] = [];

  if (
    summariesTodayCount > 0 &&
    dailySummaryAveragePreviousWeek > 0 &&
    summariesTodayCount >= Math.ceil(dailySummaryAveragePreviousWeek * 1.8)
  ) {
    attention.push({
      id: "summaries-spike",
      severity: summariesTodayCount >= Math.ceil(dailySummaryAveragePreviousWeek * 2.5)
        ? "critical"
        : "warning",
      title: "Summarize traffic spike",
      body: `${formatNumber(summariesTodayCount)} summaries today vs ${formatNumber(
        dailySummaryAveragePreviousWeek,
        { maximumFractionDigits: 1 }
      )} average in the previous week.`,
      href: "/admin_dashboard/ai-usage",
      ctaLabel: "Review AI usage",
    });
  }

  if (failedWebhookRowsLast7Days.length > 0) {
    attention.push({
      id: "webhook-failures",
      severity: failedWebhookRowsLast7Days.length >= 3 ? "critical" : "warning",
      title: "Webhook delivery failures",
      body: `${formatNumber(failedWebhookRowsLast7Days.length)} failed or rejected Lemon Squeezy deliveries in the last 7 days.`,
      href: "/admin_dashboard/inbox?tab=support",
      ctaLabel: "Check operations",
    });
  }

  attention.push({
    id: "sentry-status",
    severity: sentryConfigured ? "info" : "warning",
    title: sentryConfigured ? "Sentry DSN configured" : "Sentry DSN missing",
    body: sentryConfigured
      ? "Open Sentry directly for full error-rate investigation. FAZUMI is not using the Sentry API in-admin yet."
      : "Add a Sentry DSN to surface production errors outside the admin dashboard.",
    href: "https://sentry.io/",
    ctaLabel: "Open Sentry",
  });

  if (attention.length === 1) {
    attention.unshift({
      id: "ops-calm",
      severity: "info",
      title: "No urgent operational spikes",
      body: "Usage, webhooks, and inbox volumes look stable right now.",
    });
  }
  const activeUsersTrend30Days = Array.from(activeUsersByDay.entries()).map(([date, users]) => ({
    date,
    label: formatShortDate(new Date(`${date}T00:00:00.000Z`)),
    count: users.size,
  }));

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      totalAccounts,
      freeUsers,
      trialUsers,
      paidUsers,
      founderUsers,
    },
    onboarding: {
      onboarded,
      total: totalAccounts,
      percentage: activationRate,
    },
    newUsers: {
      today: getRangeCount(profiles, 1),
      last7Days: getRangeCount(profiles, 7),
      last14Days: getRangeCount(profiles, 14),
      last30Days: getRangeCount(profiles, 30),
      total: totalAccounts,
      chart: Array.from(chartCounts.entries()).map(([date, count]) => ({
        date,
        label: formatShortDate(new Date(`${date}T00:00:00.000Z`)),
        count,
      })),
    },
    revenue: {
      mrr: roundMoney(mrr),
      arr: roundMoney(arr),
      arpu: roundMoney(arpu),
      proMrr: roundMoney(proMrr),
      founderMrr: roundMoney(founderMrr),
      previousMrr,
      mrrTrend,
    },
    churn: {
      churnRate,
      cancellations,
      activeSubscriptions,
      previousChurnRate,
      churnTrend,
    },
    conversion: {
      conversionRate,
      trialConversion,
      totalUsers: totalAccounts,
      trialUsers: trialStartedUsers,
      paidUsers: paidPlanUsers,
      convertedTrialUsers,
    },
    founder: {
      sold: founderUsers,
      remaining: Math.max(founderCapacity - founderUsers, 0),
      percentage: roundPercentage((founderUsers / founderCapacity) * 100),
      capacity: founderCapacity,
    },
    engagement: {
      dau,
      previousDau,
      mau,
      dauMauRatio,
      dauTrend,
    },
    cac: {
      totalSpend,
      previousSpend,
      newCustomers: currentNewCustomers,
      previousNewCustomers,
      cac,
      previousCac,
      cacTrend,
      channels,
    },
    ltv: {
      arpu: roundMoney(arpu),
      avgLifespanMonths,
      ltv,
      ltvToCacRatio,
    },
    alerts: {
      failedSummaries: aiErrorLogsLast24Hours.length,
      paymentFailures: pastDueCount,
      apiErrors: aiErrorLogsLast24Hours.length + notificationsFailedLast24Hours,
      churnSpike: Math.max(roundPercentage(churnRate - previousChurnRate), 0),
      criticalFeedback,
    },
    growthPulse: {
      netMrr: roundMoney(mrr),
      netMrrDelta: roundMoney(mrr - previousMrr),
      mrrGrowthTrend: mrrTrend,
      sevenDayMomentum: toChartPoints(mrrMomentum),
      signupTrend: toChartPoints(signupTrend),
    },
    activation: {
      timeToFirstValueHours,
      activationRate,
      returningUsers,
      returningRate,
      engagedUsers: mau,
      summaryTrend: toChartPoints(summaryTrend),
    },
    retentionWarning: {
      churnRiskUsers: atRiskUserIds.size,
      retentionRate,
      retainedPaidUsers: retainedPaidUserIds.size,
      cohortRetention,
      atRiskPlans: pastDueCount,
    },
    aiUsage: {
      model: aiModel,
      requestsToday,
      tokensToday,
      costPerSummary,
      spendLast7Days,
      spendLimit: 5,
      spendTrend: toChartPoints(spendTrend),
      tokenTrend: toChartPoints(tokenTrend),
      avgLatencyMs,
      errorRate,
    },
    funnel: {
      visitors: Math.max(visitorProxyIds.size, totalAccounts),
      signups: totalAccounts,
      activated: onboarded,
      paid: paidPlanUsers,
      retained: retainedPaidUserIds.size,
      steps: [
        {
          label: "Visitors",
          count: Math.max(visitorProxyIds.size, totalAccounts),
          conversionRate: 100,
        },
        {
          label: "Signups",
          count: totalAccounts,
          conversionRate:
            Math.max(visitorProxyIds.size, totalAccounts) === 0
              ? 0
              : roundPercentage((totalAccounts / Math.max(visitorProxyIds.size, totalAccounts)) * 100),
        },
        {
          label: "Activated",
          count: onboarded,
          conversionRate: activationRate,
        },
        {
          label: "Paid",
          count: paidPlanUsers,
          conversionRate: conversionRate,
        },
        {
          label: "Retained",
          count: retainedPaidUserIds.size,
          conversionRate:
            paidPlanUsers === 0
              ? 0
              : roundPercentage((retainedPaidUserIds.size / paidPlanUsers) * 100),
        },
      ],
    },
    userIntelligence: {
      averageLtv: ltv,
      ltvToCacRatio,
      churnRiskUsers: atRiskUserIds.size,
      averageRevenuePerPaidUser: roundMoney(arpu),
      countryBreakdown,
    },
    revenueIntelligence: {
      forecast30Days: roundMoney(Math.max(mrr + (mrr - previousMrr), 0)),
      failedPayments: pastDueCount,
      expectedPayoutUsd: payoutEstimatedNet,
      nextPayoutAt: nextPayoutAt.toISOString(),
      collectionTrend: toChartPoints(collectionTrend),
      planDistribution: Array.from(planDistribution.entries()).map(([planType, entry]) => ({
        planType,
        purchases: entry.purchases,
        estimatedRevenue: roundMoney(entry.estimatedRevenue),
      })),
    },
    founderInsights: {
      peakHours,
      topSources,
      featureUsage,
      recentSubscriptions,
    },
    notifications: {
      subscribedUsers: notificationsSubscribedUsers,
      sentLast24Hours: notificationsSentLast24Hours,
      failedLast24Hours: notificationsFailedLast24Hours,
      toggles: [
        {
          key: "payment_failures",
          label: "Payment failures",
          description: "Alert when a subscription slips into past_due.",
          defaultEnabled: true,
        },
        {
          key: "ai_spend",
          label: "AI spend spike",
          description: "Alert when 7-day AI spend crosses the founder budget.",
          defaultEnabled: true,
        },
        {
          key: "churn_watch",
          label: "Churn risk",
          description: "Alert when churn or at-risk subscriptions trend upward.",
          defaultEnabled: true,
        },
        {
          key: "critical_feedback",
          label: "Critical feedback",
          description: "Alert when a critical ticket is still unresolved.",
          defaultEnabled: false,
        },
      ],
    },
    overviewKpis: {
      newUsers: {
        today: getRangeCount(profiles, 1),
        last7Days: getRangeCount(profiles, 7),
        last30Days: getRangeCount(profiles, 30),
      },
      activeUsers: {
        today: dau,
        last7Days: weeklyActiveUserIds.size,
        last30Days: mau,
      },
      summaries: {
        today: summariesTodayCount,
        last7Days: summariesLast7DaysCount,
        last30Days: summariesLast30DaysCount,
      },
      openAi: {
        todayUsd: aiCostTodayUsd,
        last7DaysUsd: spendLast7Days,
        last30DaysUsd: aiCostLast30DaysUsd,
        todayRequests: requestsToday,
        last7DaysRequests: aiSuccessLogsLast7Days.length,
        last30DaysRequests: aiRequestsLast30Days,
      },
      revenueMtdUsd: roundMoney(revenueMtdUsd),
      failedWebhooks7Days: failedWebhookRowsLast7Days.length,
      supportNew: supportItems.filter((row) => row.status === "new").length,
      feedbackNew: feedbackItems.filter((row) => row.status === "new").length,
    },
    attention,
    health: {
      sentryConfigured,
      sentryUrl: "https://sentry.io/",
      summaryTrend30Days: toChartPoints(summaryTrend30Days),
      activeUsersTrend30Days,
      aiSpendTrend30Days: toChartPoints(aiSpendTrend30Days),
      recentWebhookFailures: failedWebhookRowsLast7Days.slice(0, 5),
      recentSupport: supportItems.slice(0, 5),
      recentFeedback: feedbackItems.slice(0, 5),
    },
  };
}

async function fetchProfilesPage(page: number, pageSize: number): Promise<{ profiles: ProfileRow[]; total: number }> {
  const admin = createAdminClient();
  const offset = (page - 1) * pageSize;

  const [countResult, rowsResult] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id, full_name, plan, trial_expires_at, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1),
  ]);

  if (rowsResult.error) {
    throw new Error(`Could not read profiles: ${rowsResult.error.message}`);
  }

  return {
    profiles: (rowsResult.data ?? []) as ProfileRow[],
    total: countResult.count ?? 0,
  };
}

async function fetchSubscriptionsForUsers(userIds: string[]): Promise<SubscriptionRow[]> {
  if (userIds.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("user_id, plan_type, status, current_period_end, created_at, updated_at, ls_subscription_id, ls_order_id")
    .in("user_id", userIds)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Could not read subscriptions: ${error.message}`);
  }

  return (data ?? []) as SubscriptionRow[];
}

async function fetchSummaryCountsForUsers(
  userIds: string[],
  since: Date
): Promise<Map<string, number>> {
  const countMap = new Map<string, number>();

  if (userIds.length === 0) {
    return countMap;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("summaries")
    .select("user_id")
    .in("user_id", userIds)
    .gte("created_at", since.toISOString())
    .is("deleted_at", null);

  if (error) {
    // Non-fatal — return empty counts rather than throwing
    return countMap;
  }

  for (const row of data ?? []) {
    const uid = (row as { user_id: string }).user_id;
    countMap.set(uid, (countMap.get(uid) ?? 0) + 1);
  }

  return countMap;
}

function resolveSubscriptionStatus(
  userSubs: SubscriptionRow[]
): "active" | "cancelled" | "past_due" | "expired" | null {
  if (userSubs.length === 0) {
    return null;
  }

  // Prefer the most recently updated paid subscription
  const paidSubs = userSubs.filter((s) => isPaidPlanType(s.plan_type));

  if (paidSubs.length === 0) {
    return null;
  }

  // Return the status of the most recently updated subscription
  const latest = paidSubs[0]; // already sorted by updated_at DESC
  const status = latest.status;

  if (status === "active" || status === "cancelled" || status === "past_due" || status === "expired") {
    return status;
  }

  return null;
}

function matchesUserSearch(
  profile: ProfileRow,
  authUser: AuthUserRow | undefined,
  query: string
): boolean {
  const q = query.toLowerCase();
  const fields = [
    profile.id,
    profile.full_name ?? "",
    authUser?.email ?? "",
    authUser?.phone ?? "",
    authUser?.fullName ?? "",
  ];

  return fields.some((f) => f.toLowerCase().includes(q));
}

export async function getAdminUsersData(
  page = 1,
  pageSize = 50,
  search?: string
): Promise<AdminUsersData> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(10, pageSize));
  const trimmedSearch = search?.trim() ?? "";
  const since30Days = subtractUtcDays(startOfUtcDay(), 29);

  if (trimmedSearch) {
    // Search mode: load all profiles + all auth users, filter in memory, then paginate
    const [allProfiles, authUsers, pushSubscriptions] = await Promise.all([
      fetchProfiles(),
      fetchAuthUsers(),
      fetchPushSubscriptions(),
    ]);

    const authUsersById = createAuthUserMap(authUsers);
    const pushSubscriptionByUserId = new Map<string, PushSubscriptionRow>();

    for (const row of pushSubscriptions) {
      if (!pushSubscriptionByUserId.has(row.user_id)) {
        pushSubscriptionByUserId.set(row.user_id, row);
      }
    }

    const matched = allProfiles.filter((p) =>
      matchesUserSearch(p, authUsersById.get(p.id), trimmedSearch)
    );

    const total = matched.length;
    const pageProfiles = matched.slice((safePage - 1) * safePageSize, safePage * safePageSize);
    const pageUserIds = pageProfiles.map((p) => p.id);

    const [pageSubs, summaryCountMap] = await Promise.all([
      fetchSubscriptionsForUsers(pageUserIds),
      fetchSummaryCountsForUsers(pageUserIds, since30Days),
    ]);

    const latestSummaryByUserId = new Map<string, string>();
    // We need all summaries for activity — but for search results, build activity from summary counts
    // Get the most recent summary per user for the page.
    // Limit to pageUserIds.length * 10 rows: enough to capture at least one per user
    // without an unbounded scan. Rows are ordered DESC so the first hit per user_id wins.
    const adminForSummaries = createAdminClient();
    if (pageUserIds.length > 0) {
      const { data: recentSummaries } = await adminForSummaries
        .from("summaries")
        .select("user_id, created_at")
        .in("user_id", pageUserIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(pageUserIds.length * 10);

      for (const row of recentSummaries ?? []) {
        const r = row as { user_id: string; created_at: string };
        if (!latestSummaryByUserId.has(r.user_id)) {
          latestSummaryByUserId.set(r.user_id, r.created_at);
        }
      }
    }

    const subsByUserId = new Map<string, SubscriptionRow[]>();
    for (const sub of pageSubs) {
      const list = subsByUserId.get(sub.user_id) ?? [];
      list.push(sub);
      subsByUserId.set(sub.user_id, list);
    }

    const users: AdminUserRecord[] = pageProfiles.map((profile) => {
      const authUser = authUsersById.get(profile.id);
      const pushSub = pushSubscriptionByUserId.get(profile.id);
      const displayName =
        profile.full_name?.trim() ||
        authUser?.fullName?.trim() ||
        authUser?.email ||
        authUser?.phone ||
        "—";

      return {
        id: profile.id,
        displayName,
        email: authUser?.email ?? null,
        phone: authUser?.phone ?? null,
        subscriptionType: resolvePlanType(profile.plan, profile.trial_expires_at),
        subscriptionStatus: resolveSubscriptionStatus(subsByUserId.get(profile.id) ?? []),
        trialExpiresAt: profile.trial_expires_at ?? null,
        summariesLast30Days: summaryCountMap.get(profile.id) ?? 0,
        activityAt: latestSummaryByUserId.get(profile.id) ?? null,
        joinedAt: profile.created_at ?? null,
        bannedUntil: authUser?.bannedUntil ?? null,
        country: resolveCountry(authUser?.phone, pushSub?.timezone),
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      total,
      page: safePage,
      pageSize: safePageSize,
      pages: Math.max(1, Math.ceil(total / safePageSize)),
      users,
    };
  }

  // Normal paginated mode
  const [{ profiles, total }, summaries, authUsers, pushSubscriptions] = await Promise.all([
    fetchProfilesPage(safePage, safePageSize),
    fetchSummaries(),
    fetchAuthUsers(),
    fetchPushSubscriptions(),
  ]);

  const pageUserIds = profiles.map((p) => p.id);
  const [pageSubs, summaryCountMap] = await Promise.all([
    fetchSubscriptionsForUsers(pageUserIds),
    fetchSummaryCountsForUsers(pageUserIds, since30Days),
  ]);

  const latestSummaryByUserId = new Map<string, string>();
  const pushSubscriptionByUserId = new Map<string, PushSubscriptionRow>();

  for (const summary of summaries) {
    if (!latestSummaryByUserId.has(summary.user_id)) {
      latestSummaryByUserId.set(summary.user_id, summary.created_at);
    }
  }

  for (const row of pushSubscriptions) {
    if (!pushSubscriptionByUserId.has(row.user_id)) {
      pushSubscriptionByUserId.set(row.user_id, row);
    }
  }

  const subsByUserId = new Map<string, SubscriptionRow[]>();
  for (const sub of pageSubs) {
    const list = subsByUserId.get(sub.user_id) ?? [];
    list.push(sub);
    subsByUserId.set(sub.user_id, list);
  }

  const authUsersById = createAuthUserMap(authUsers);
  const users: AdminUserRecord[] = profiles.map((profile) => {
    const authUser = authUsersById.get(profile.id);
    const pushSubscription = pushSubscriptionByUserId.get(profile.id);
    const displayName =
      profile.full_name?.trim() ||
      authUser?.fullName?.trim() ||
      authUser?.email ||
      authUser?.phone ||
      "—";

    return {
      id: profile.id,
      displayName,
      email: authUser?.email ?? null,
      phone: authUser?.phone ?? null,
      subscriptionType: resolvePlanType(profile.plan, profile.trial_expires_at),
      subscriptionStatus: resolveSubscriptionStatus(subsByUserId.get(profile.id) ?? []),
      trialExpiresAt: profile.trial_expires_at ?? null,
      summariesLast30Days: summaryCountMap.get(profile.id) ?? 0,
      activityAt: latestSummaryByUserId.get(profile.id) ?? null,
      joinedAt: profile.created_at ?? null,
      bannedUntil: authUser?.bannedUntil ?? null,
      country: resolveCountry(authUser?.phone, pushSubscription?.timezone),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    total,
    page: safePage,
    pageSize: safePageSize,
    pages: Math.max(1, Math.ceil(total / safePageSize)),
    users,
  };
}

interface DetailProfileRow extends ProfileRow {
  lifetime_free_used: number | null;
  lang_pref: string | null;
}

export async function getAdminUserDetail(userId: string): Promise<import("./types").AdminUserDetail | null> {
  const admin = createAdminClient();
  const since30Days = subtractUtcDays(startOfUtcDay(), 29);

  const [profileResult, authUserResult, subscriptionsResult, totalSummariesResult, recentSummariesResult, auditLogResult, lastSummaryResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, plan, trial_expires_at, created_at, lifetime_free_used, lang_pref")
      .eq("id", userId)
      .single(),
    admin.auth.admin.getUserById(userId),
    admin
      .from("subscriptions")
      .select("id, user_id, plan_type, status, current_period_end, ls_subscription_id, ls_order_id, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    admin
      .from("summaries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null),
    admin
      .from("summaries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("created_at", since30Days.toISOString()),
    admin
      .from("admin_audit_log")
      .select("id, admin_username, action, details, ip, created_at")
      .contains("target_ids", [userId])
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("summaries")
      .select("created_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileResult.error || !profileResult.data) {
    return null;
  }

  const profile = profileResult.data as DetailProfileRow;
  const authUser = authUserResult.data?.user;
  const subs = (subscriptionsResult.data ?? []) as Array<{
    id: string;
    plan_type: string | null;
    status: string | null;
    current_period_end: string | null;
    ls_subscription_id: string | null;
    ls_order_id: string | null;
    created_at: string;
    updated_at: string | null;
  }>;
  const auditRows = (auditLogResult.data ?? []) as Array<{
    id: string;
    admin_username: string;
    action: string;
    details: Record<string, unknown>;
    ip: string | null;
    created_at: string;
  }>;

  const displayName =
    profile.full_name?.trim() ||
    (typeof authUser?.user_metadata?.full_name === "string" ? authUser.user_metadata.full_name.trim() : null) ||
    authUser?.email ||
    authUser?.phone ||
    "—";

  const paidSubs = subs.filter((s) => isPaidPlanType(s.plan_type));
  const latestPaidSub = paidSubs[0];

  let subStatus: "active" | "cancelled" | "past_due" | "expired" | null = null;

  if (latestPaidSub?.status === "active" || latestPaidSub?.status === "cancelled" || latestPaidSub?.status === "past_due" || latestPaidSub?.status === "expired") {
    subStatus = latestPaidSub.status;
  }

  const authPhone = authUser?.phone ?? null;
  const { data: pushSubData } = await admin
    .from("push_subscriptions")
    .select("timezone")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  const pushSub = pushSubData as { timezone: string | null } | null;

  return {
    id: profile.id,
    displayName,
    email: authUser?.email ?? null,
    phone: authPhone,
    subscriptionType: resolvePlanType(profile.plan, profile.trial_expires_at),
    subscriptionStatus: subStatus,
    trialExpiresAt: profile.trial_expires_at ?? null,
    lifetimeFreeUsed: profile.lifetime_free_used ?? 0,
    summariesTotal: totalSummariesResult.count ?? 0,
    summariesLast30Days: recentSummariesResult.count ?? 0,
    activityAt: (lastSummaryResult.data as { created_at: string } | null)?.created_at ?? null,
    joinedAt: profile.created_at,
    bannedUntil: authUser?.banned_until ?? null,
    country: resolveCountry(authPhone, pushSub?.timezone),
    langPref: profile.lang_pref ?? null,
    subscriptions: subs.map((s) => ({
      id: s.id,
      planType: s.plan_type ?? "unknown",
      status: s.status ?? "unknown",
      currentPeriodEnd: s.current_period_end ?? null,
      lsSubscriptionId: s.ls_subscription_id ?? null,
      lsOrderId: s.ls_order_id ?? null,
      createdAt: s.created_at,
      updatedAt: s.updated_at ?? null,
    })),
    recentAuditLog: auditRows.map((r) => ({
      id: r.id,
      adminUsername: r.admin_username,
      action: r.action,
      details: r.details ?? {},
      ip: r.ip ?? null,
      createdAt: r.created_at,
    })),
  };
}

export async function getAdminAiUsageData(): Promise<AdminAiUsageData> {
  const logs = await fetchAiRequestLogs();
  const generatedAt = new Date().toISOString();
  const todayStart = startOfUtcDay();
  const last7WindowStart = subtractUtcDays(todayStart, 6);
  const spendTrend = createDailyCountMap(7, todayStart);
  const tokenTrend = createDailyCountMap(7, todayStart);
  const latencySumByDate = createDailyCountMap(7, todayStart);
  const latencyCountByDate = createDailyCountMap(7, todayStart);
  const model = logs[0]?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const successLogs = logs.filter((row) => row.status === "success");
  const errorLogs = logs.filter((row) => row.status === "error");
  const logsLast24Hours = logs.filter(
    (row) => new Date(row.created_at).getTime() >= Date.now() - (24 * 60 * 60 * 1000)
  );
  const logsLast7Days = logs.filter(
    (row) => new Date(row.created_at).getTime() >= last7WindowStart.getTime()
  );
  const successLogsLast7Days = successLogs.filter(
    (row) => new Date(row.created_at).getTime() >= last7WindowStart.getTime()
  );
  const errorLogsLast7Days = errorLogs.filter(
    (row) => new Date(row.created_at).getTime() >= last7WindowStart.getTime()
  );
  const errorBreakdownMap = new Map<string, number>();
  const minuteCounts = new Map<string, number>();

  for (const row of successLogsLast7Days) {
    incrementDailyCount(spendTrend, row.created_at, Number(row.estimated_cost_usd ?? 0));
    incrementDailyCount(tokenTrend, row.created_at, Number(row.total_tokens ?? 0));
    incrementDailyCount(latencySumByDate, row.created_at, Number(row.latency_ms ?? 0));
    incrementDailyCount(latencyCountByDate, row.created_at, 1);
  }

  for (const row of errorLogsLast7Days) {
    const code = row.error_code ?? "unknown";
    errorBreakdownMap.set(code, (errorBreakdownMap.get(code) ?? 0) + 1);
  }

  for (const row of logsLast24Hours) {
    const minuteKey = getMinuteKey(row.created_at);
    minuteCounts.set(minuteKey, (minuteCounts.get(minuteKey) ?? 0) + 1);
  }

  const latencyTrend = Array.from(latencySumByDate.entries()).map(([date, totalLatency]) => {
    const count = latencyCountByDate.get(date) ?? 0;

    return {
      date,
      label: formatShortDate(new Date(`${date}T00:00:00.000Z`)),
      count: count === 0 ? 0 : roundMoney(totalLatency / count),
    };
  });
  const totalCost7Days = roundMoney(
    successLogsLast7Days.reduce((sum, row) => sum + Number(row.estimated_cost_usd ?? 0), 0)
  );
  const totalTokens7Days = successLogsLast7Days.reduce(
    (sum, row) => sum + Number(row.total_tokens ?? 0),
    0
  );
  const avgLatencyMs = roundMoney(
    average(successLogsLast7Days.map((row) => Number(row.latency_ms ?? 0)))
  );
  const successRate =
    logsLast7Days.length === 0
      ? 0
      : roundPercentage((successLogsLast7Days.length / logsLast7Days.length) * 100);
  const recommendedRequestsPerMinute = resolveAiPricing(model).recommendedRequestsPerMinute;
  const peakRequestsPerMinute = Math.max(...minuteCounts.values(), 0);
  const headroom = Math.max(recommendedRequestsPerMinute - peakRequestsPerMinute, 0);
  const rateLimitStatus: AdminMetricStatus =
    peakRequestsPerMinute <= recommendedRequestsPerMinute * 0.5
      ? "good"
      : peakRequestsPerMinute <= recommendedRequestsPerMinute * 0.8
        ? "warning"
        : "critical";

  return {
    generatedAt,
    model,
    totals: {
      requests24Hours: logsLast24Hours.length,
      requests7Days: logsLast7Days.length,
      totalTokens7Days,
      avgTokensPerRequest:
        successLogsLast7Days.length === 0
          ? 0
          : roundMoney(totalTokens7Days / successLogsLast7Days.length),
      totalCost7Days,
      avgCostPerRequest:
        successLogsLast7Days.length === 0
          ? 0
          : roundMicroMoney(totalCost7Days / successLogsLast7Days.length),
      avgLatencyMs,
      successRate,
      errorRate:
        logsLast7Days.length === 0
          ? 0
          : roundPercentage((errorLogsLast7Days.length / logsLast7Days.length) * 100),
    },
    spendTrend: toChartPoints(spendTrend),
    tokenTrend: toChartPoints(tokenTrend),
    latencyTrend,
    errorBreakdown: Array.from(errorBreakdownMap.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([code, count]) => ({ code, count })),
    recentEvents: logs.slice(0, 25).map((row) => ({
      id: row.id,
      userId: row.user_id,
      model: row.model ?? model,
      status: row.status === "error" ? "error" : "success",
      errorCode: row.error_code ?? null,
      inputChars: Number(row.input_chars ?? 0),
      promptTokens: Number(row.prompt_tokens ?? 0),
      completionTokens: Number(row.completion_tokens ?? 0),
      totalTokens: Number(row.total_tokens ?? 0),
      estimatedCostUsd: Number(row.estimated_cost_usd ?? 0),
      latencyMs: Number(row.latency_ms ?? 0),
      createdAt: row.created_at,
    })),
    rateLimit: {
      peakRequestsPerMinute,
      recommendedRequestsPerMinute,
      headroom,
      status: rateLimitStatus,
    },
  };
}

export async function getAdminFeedbackData(): Promise<AdminFeedbackData> {
  const [feedbackRows, authUsers] = await Promise.all([
    fetchFeedbackRows(),
    fetchAuthUsers(),
  ]);
  const authUsersById = createAuthUserMap(authUsers);
  const byTypeMap = new Map<AdminFeedbackType, number>();
  const feedback: AdminFeedbackRow[] = feedbackRows.flatMap((row) => {
    const mapped = mapFeedbackRow(row, authUsersById);
    if (mapped.type === "support") {
      return [];
    }
    const type = mapped.type;
    byTypeMap.set(type, (byTypeMap.get(type) ?? 0) + 1);

    return [mapped];
  });

  return {
    generatedAt: new Date().toISOString(),
    total: feedback.length,
    pending: feedback.filter((row) => row.status === "new").length,
    resolved: feedback.filter((row) => row.status === "resolved").length,
    critical: feedback.filter((row) => row.priority === "critical").length,
    byType: Array.from(byTypeMap.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([type, count]) => ({ type, count })),
    feedback,
  };
}

export interface InboxFilters {
  tab?: "feedback" | "support" | "all";
  status?: string;
  priority?: string;
  locale?: string;
  tag?: string;
  search?: string;
  dateWindow?: "today" | "7d" | "30d" | "all";
  page?: number;
  pageSize?: number;
}

async function fetchFeedbackFiltered(filters: InboxFilters) {
  const admin = createAdminClient();
  const { status, priority, locale, tag, search, dateWindow = "all", page = 1, pageSize = 50 } = filters;
  const offset = (page - 1) * pageSize;

  try {
    let query = admin
      .from("user_feedback")
      .select(
        "id, user_id, email, phone_e164, subject, locale, type, status, priority, message, rating, tags, admin_notes, response, responded_at, created_at, last_updated_at",
        { count: "exact" }
      )
      .neq("type", "support")
      .order("created_at", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);
    if (priority && priority !== "all") query = query.eq("priority", priority);
    if (locale && locale !== "all") query = query.eq("locale", locale);
    if (tag && tag !== "all") query = query.contains("tags", [tag]);
    if (search) query = query.or(`subject.ilike.%${search}%,message.ilike.%${search}%`);
    if (dateWindow !== "all") {
      const msBack = dateWindow === "today" ? 86_400_000 : dateWindow === "7d" ? 604_800_000 : 2_592_000_000;
      query = query.gte("created_at", new Date(Date.now() - msBack).toISOString());
    }

    const { data, count, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Could not read user_feedback: ${error.message}`);
    return { rows: (data ?? []) as FeedbackRowModern[], total: count ?? 0 };
  } catch (error) {
    if (error instanceof Error && (error.message.includes("column") || error.message.includes("schema cache"))) {
      // Legacy schema fallback — return all rows unfiltered
      const legacyRows = await fetchFeedbackRows();
      return { rows: legacyRows as FeedbackRowModern[], total: legacyRows.length };
    }
    if (error instanceof Error && (error.message.includes("user_feedback") || error.message.includes("relation"))) {
      return { rows: [] as FeedbackRowModern[], total: 0 };
    }
    throw error;
  }
}

async function fetchSupportFiltered(filters: InboxFilters) {
  const admin = createAdminClient();
  const { status, priority, search, dateWindow = "all", page = 1, pageSize = 50 } = filters;
  const offset = (page - 1) * pageSize;

  try {
    let query = admin
      .from("support_requests")
      .select(
        "id, user_id, email, phone_e164, subject, message, locale, status, priority, tags, admin_notes, resolved_at, created_at, last_updated_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);
    if (priority && priority !== "all") query = query.eq("priority", priority);
    if (search) query = query.or(`subject.ilike.%${search}%,message.ilike.%${search}%`);
    if (dateWindow !== "all") {
      const msBack = dateWindow === "today" ? 86_400_000 : dateWindow === "7d" ? 604_800_000 : 2_592_000_000;
      query = query.gte("created_at", new Date(Date.now() - msBack).toISOString());
    }

    const { data, count, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Could not read support_requests: ${error.message}`);
    return { rows: (data ?? []) as SupportRequestTableRow[], total: count ?? 0 };
  } catch (error) {
    if (error instanceof Error && (error.message.includes("support_requests") || error.message.includes("relation"))) {
      return { rows: [] as SupportRequestTableRow[], total: 0 };
    }
    throw error;
  }
}

export async function getAdminInboxData(filters: InboxFilters = {}): Promise<AdminInboxData> {
  const { tab = "all", page = 1, pageSize = 50 } = filters;
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(10, pageSize));
  const filtersWithPage = { ...filters, page: safePage, pageSize: safePageSize };

  // Determine which tables to query based on tab
  const needsFeedback = tab !== "support";
  const needsSupport = tab !== "feedback";

  const [feedbackResult, supportRawResult] = await Promise.all([
    needsFeedback ? fetchFeedbackFiltered(filtersWithPage) : Promise.resolve({ rows: [] as FeedbackRowModern[], total: 0 }),
    needsSupport ? fetchSupportFiltered(filtersWithPage) : Promise.resolve({ rows: [] as SupportRequestTableRow[], total: 0 }),
  ]);

  const authUsers = await fetchAuthUsers();
  const authUsersById = createAuthUserMap(authUsers);

  const mappedFeedback = feedbackResult.rows.map((row) => mapFeedbackRow(row, authUsersById));
  const feedbackItems = mappedFeedback.filter((row) => row.type !== "support");

  // Support items: prefer support_requests table; fall back to support-type feedback rows
  const supportItems =
    supportRawResult.rows.length > 0 || needsSupport
      ? supportRawResult.rows.map((row) => mapSupportRequestRow(row))
      : mappedFeedback
          .filter((row) => row.type === "support")
          .map((row) => ({
            id: row.id,
            userId: row.userId,
            email: row.email,
            phone: row.phone,
            status: row.status,
            priority: row.priority,
            locale: row.locale,
            subject: row.subject,
            message: row.message,
            tags: row.tags,
            adminNotes: row.adminNotes,
            resolvedAt: row.respondedAt,
            createdAt: row.createdAt,
            lastUpdatedAt: row.lastUpdatedAt,
          }));

  // For summary counts (newCount, openCount, etc.) fetch ALL unfiltered counts for this tab
  // to avoid showing "0 new" when a status filter is active.
  const [allFeedback, allSupport] = await Promise.all([
    needsFeedback ? fetchFeedbackRows() : Promise.resolve([]),
    needsSupport ? fetchSupportRequests() : Promise.resolve([]),
  ]);
  const allFeedbackMapped = allFeedback.map((row) => mapFeedbackRow(row, authUsersById)).filter((r) => r.type !== "support");
  const allSupportMapped = allSupport.map((row) => mapSupportRequestRow(row));

  return {
    generatedAt: new Date().toISOString(),
    feedback: {
      total: feedbackResult.total,
      newCount: allFeedbackMapped.filter((row) => row.status === "new").length,
      openCount: allFeedbackMapped.filter((row) => isOpenFeedbackStatus(row.status)).length,
      highPriorityCount: allFeedbackMapped.filter((row) => row.priority === "high" || row.priority === "critical").length,
      tags: collectTagOptions(allFeedbackMapped),
      items: feedbackItems,
      page: safePage,
      pageSize: safePageSize,
      pages: Math.max(1, Math.ceil(feedbackResult.total / safePageSize)),
    },
    support: {
      total: supportRawResult.total,
      newCount: allSupportMapped.filter((row) => row.status === "new").length,
      openCount: allSupportMapped.filter((row) => isOpenSupportStatus(row.status)).length,
      highPriorityCount: allSupportMapped.filter((row) => row.priority === "high" || row.priority === "critical").length,
      tags: collectTagOptions(allSupportMapped),
      items: supportItems,
      page: safePage,
      pageSize: safePageSize,
      pages: Math.max(1, Math.ceil(supportRawResult.total / safePageSize)),
    },
  };
}

export async function getAdminIncomeData(): Promise<AdminIncomeData> {
  const [profiles, subscriptions, marketingSpend] = await Promise.all([
    fetchProfiles(),
    fetchSubscriptions(),
    fetchMarketingSpend(),
  ]);
  const todayStart = startOfUtcDay();
  const todayThreshold = subtractUtcDays(startOfUtcDay(), 0).getTime();
  const last7Threshold = subtractUtcDays(startOfUtcDay(), 6).getTime();
  const last30Threshold = subtractUtcDays(startOfUtcDay(), 29).getTime();
  const monthStart = createUtcDate(
    todayStart.getUTCFullYear(),
    todayStart.getUTCMonth(),
    1
  ).getTime();
  let today = 0;
  let last7Days = 0;
  let last30Days = 0;
  let overall = 0;
  let proUsers = 0;
  let founderUsers = 0;
  let newCustomers = 0;
  const nextPayoutAt = getNextPayoutDate();
  const nextPayoutKey = nextPayoutAt.toISOString().slice(0, 10);
  const batchCreatedAt = getBatchCreatedAt(nextPayoutAt);
  let payoutEligiblePurchases = 0;
  let payoutEstimatedGross = 0;
  let payoutEstimatedPlatformFees = 0;
  const breakdown = new Map<"monthly" | "annual" | "founder", { purchases: number; estimatedRevenue: number }>();

  breakdown.set("monthly", { purchases: 0, estimatedRevenue: 0 });
  breakdown.set("annual", { purchases: 0, estimatedRevenue: 0 });
  breakdown.set("founder", { purchases: 0, estimatedRevenue: 0 });

  for (const profile of profiles) {
    const planType = resolvePlanType(profile.plan, profile.trial_expires_at);
    const createdAt = new Date(profile.created_at).getTime();

    if (planType === "monthly" || planType === "annual") {
      proUsers += 1;
    }

    if (planType === "founder") {
      founderUsers += 1;
    }

    if (createdAt >= last30Threshold) {
      newCustomers += 1;
    }
  }

  for (const subscription of subscriptions) {
    if (
      subscription.plan_type !== "monthly" &&
      subscription.plan_type !== "annual" &&
      subscription.plan_type !== "founder"
    ) {
      continue;
    }

    const amount = getRevenueForPlan(subscription.plan_type);
    const createdAt = new Date(subscription.created_at).getTime();
    const entry = breakdown.get(subscription.plan_type);

    if (entry) {
      entry.purchases += 1;
      entry.estimatedRevenue += amount;
    }

    overall += amount;

    if (createdAt >= todayThreshold) {
      today += amount;
    }

    if (createdAt >= last7Threshold) {
      last7Days += amount;
    }

    if (createdAt >= last30Threshold) {
      last30Days += amount;
    }

    if (getEstimatedPayoutDateForSale(subscription.created_at).toISOString().slice(0, 10) === nextPayoutKey) {
      payoutEligiblePurchases += 1;
      payoutEstimatedGross += amount;
      payoutEstimatedPlatformFees += getEstimatedPlatformFee(subscription.plan_type);
    }
  }

  const payoutGrossRounded = roundMoney(payoutEstimatedGross);
  const payoutPlatformFeesRounded = roundMoney(payoutEstimatedPlatformFees);
  const payoutAfterPlatformFees = Math.max(payoutGrossRounded - payoutPlatformFeesRounded, 0);
  const payoutEstimatedFee = roundMoney(payoutAfterPlatformFees * NON_US_BANK_PAYOUT_FEE_RATE);
  const payoutEstimatedNet = roundMoney(Math.max(payoutAfterPlatformFees - payoutEstimatedFee, 0));
  const spendLast30Days = roundMoney(
    marketingSpend.reduce((sum, row) => {
      const monthTime = new Date(`${row.month}T00:00:00.000Z`).getTime();
      return monthTime >= last30Threshold ? sum + Number(row.amount) : sum;
    }, 0)
  );
  const spendCurrentMonth = roundMoney(
    marketingSpend.reduce((sum, row) => {
      const monthTime = new Date(`${row.month}T00:00:00.000Z`).getTime();
      return monthTime >= monthStart ? sum + Number(row.amount) : sum;
    }, 0)
  );
  const currentCac = newCustomers === 0 ? 0 : roundMoney(spendLast30Days / newCustomers);

  return {
    generatedAt: new Date().toISOString(),
    currency: "USD",
    estimated: true,
    fx: {
      qarPerUsd: QAR_PER_USD,
    },
    cards: {
      today: roundMoney(today),
      last7Days: roundMoney(last7Days),
      last30Days: roundMoney(last30Days),
      overall: roundMoney(overall),
    },
    counts: {
      proUsers,
      founderUsers,
    },
    breakdown: Array.from(breakdown.entries()).map(([planType, entry]) => ({
      planType,
      purchases: entry.purchases,
      estimatedRevenue: entry.estimatedRevenue,
    })),
    payout: {
      nextPayoutAt: nextPayoutAt.toISOString(),
      batchCreatedAt: batchCreatedAt.toISOString(),
      bankArrivalStartAt: addUtcDays(nextPayoutAt, 1).toISOString(),
      bankArrivalEndAt: addUtcDays(nextPayoutAt, 5).toISOString(),
      eligiblePurchases: payoutEligiblePurchases,
      estimatedGross: payoutGrossRounded,
      estimatedPlatformFees: payoutPlatformFeesRounded,
      estimatedPayoutFee: payoutEstimatedFee,
      estimatedNet: payoutEstimatedNet,
      thresholdUsd: LEMON_PAYOUT_THRESHOLD_USD,
      thresholdMet: payoutEstimatedNet >= LEMON_PAYOUT_THRESHOLD_USD,
    },
    cac: {
      currentCac,
      totalSpend: spendLast30Days,
      newCustomers,
    },
    marketingSpend: {
      currentMonth: spendCurrentMonth,
      totalLast30Days: spendLast30Days,
      entries: marketingSpend.map((row) => ({
        id: row.id,
        month: row.month,
        channel: row.channel?.trim() || "organic",
        amount: roundMoney(Number(row.amount ?? 0)),
        notes: row.notes,
        createdAt: row.created_at,
      })),
    },
  };
}

export async function getRecentSubscriptionEvents(limit = 10): Promise<AdminSubscriptionEvent[]> {
  const [subscriptions, authUsers] = await Promise.all([
    fetchRecentSubscriptions(limit),
    fetchAuthUsers(),
  ]);
  const authUsersById = createAuthUserMap(authUsers);

  return subscriptions.map((subscription) => {
    const updatedAt = subscription.updated_at ?? subscription.created_at;
    const authUser = authUsersById.get(subscription.user_id);

    return {
      id: `${subscription.ls_subscription_id ?? subscription.ls_order_id ?? subscription.user_id}-${updatedAt}`,
      userId: subscription.user_id,
      email: authUser?.email ?? null,
      planType: subscription.plan_type ?? "unknown",
      status: subscription.status ?? "unknown",
      eventType:
        subscription.updated_at && subscription.updated_at !== subscription.created_at
          ? "updated"
          : "created",
      eventAt: updatedAt,
      createdAt: subscription.created_at,
      updatedAt: subscription.updated_at,
      reference:
        subscription.ls_subscription_id ??
        subscription.ls_order_id ??
        subscription.user_id,
    };
  });
}
