import type { Locale } from "@/lib/i18n";

export type AdminPlanType = "free" | "trial" | "monthly" | "annual" | "founder";

export interface AdminChartPoint {
  date: string;
  label: string;
  count: number;
}

export type AdminMetricStatus = "good" | "warning" | "critical" | "neutral";

export interface AdminMarketingChannelSpend {
  channel: string;
  amount: number;
  percentage: number;
}

export interface AdminFunnelStep {
  label: string;
  count: number;
  conversionRate: number;
}

export interface AdminCountryMetric {
  country: string;
  count: number;
  percentage: number;
}

export interface AdminFeatureUsageMetric {
  label: string;
  count: number;
}

export interface AdminInsightMetric {
  label: string;
  count: number;
  percentage?: number;
}

export interface AdminNotificationToggle {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

export interface AdminOverviewMetrics {
  generatedAt: string;
  totals: {
    totalAccounts: number;
    freeUsers: number;
    trialUsers: number;
    paidUsers: number;
    founderUsers: number;
  };
  onboarding: {
    onboarded: number;
    total: number;
    percentage: number;
  };
  newUsers: {
    today: number;
    last7Days: number;
    last14Days: number;
    last30Days: number;
    total: number;
    chart: AdminChartPoint[];
  };
  revenue: {
    mrr: number;
    arr: number;
    arpu: number;
    proMrr: number;
    founderMrr: number;
    previousMrr: number;
    mrrTrend: number;
  };
  churn: {
    churnRate: number;
    cancellations: number;
    activeSubscriptions: number;
    previousChurnRate: number;
    churnTrend: number;
  };
  conversion: {
    conversionRate: number;
    trialConversion: number;
    totalUsers: number;
    trialUsers: number;
    paidUsers: number;
    convertedTrialUsers: number;
  };
  founder: {
    sold: number;
    remaining: number;
    percentage: number;
    capacity: number;
  };
  engagement: {
    dau: number;
    previousDau: number;
    mau: number;
    dauMauRatio: number;
    dauTrend: number;
  };
  cac: {
    totalSpend: number;
    previousSpend: number;
    newCustomers: number;
    previousNewCustomers: number;
    cac: number;
    previousCac: number;
    cacTrend: number;
    channels: AdminMarketingChannelSpend[];
  };
  ltv: {
    arpu: number;
    avgLifespanMonths: number;
    ltv: number;
    ltvToCacRatio: number;
  };
  alerts: {
    failedSummaries: number;
    paymentFailures: number;
    apiErrors: number;
    churnSpike: number;
    criticalFeedback: number;
  };
  growthPulse: {
    netMrr: number;
    netMrrDelta: number;
    mrrGrowthTrend: number;
    sevenDayMomentum: AdminChartPoint[];
    signupTrend: AdminChartPoint[];
  };
  activation: {
    timeToFirstValueHours: number;
    activationRate: number;
    returningUsers: number;
    returningRate: number;
    engagedUsers: number;
    summaryTrend: AdminChartPoint[];
  };
  retentionWarning: {
    churnRiskUsers: number;
    retentionRate: number;
    retainedPaidUsers: number;
    cohortRetention: AdminChartPoint[];
    atRiskPlans: number;
  };
  aiUsage: {
    model: string;
    requestsToday: number;
    tokensToday: number;
    costPerSummary: number;
    spendLast7Days: number;
    spendLimit: number;
    spendTrend: AdminChartPoint[];
    tokenTrend: AdminChartPoint[];
    avgLatencyMs: number;
    errorRate: number;
  };
  funnel: {
    visitors: number;
    signups: number;
    activated: number;
    paid: number;
    retained: number;
    steps: AdminFunnelStep[];
  };
  userIntelligence: {
    averageLtv: number;
    ltvToCacRatio: number;
    churnRiskUsers: number;
    averageRevenuePerPaidUser: number;
    countryBreakdown: AdminCountryMetric[];
  };
  revenueIntelligence: {
    forecast30Days: number;
    failedPayments: number;
    expectedPayoutUsd: number;
    nextPayoutAt: string | null;
    collectionTrend: AdminChartPoint[];
    planDistribution: AdminRevenueBreakdownRow[];
  };
  founderInsights: {
    peakHours: AdminChartPoint[];
    topSources: AdminInsightMetric[];
    featureUsage: AdminFeatureUsageMetric[];
    recentSubscriptions: AdminSubscriptionEvent[];
  };
  notifications: {
    subscribedUsers: number;
    sentLast24Hours: number;
    failedLast24Hours: number;
    toggles: AdminNotificationToggle[];
  };
  overviewKpis: {
    newUsers: AdminOverviewKpiSnapshot;
    activeUsers: AdminOverviewKpiSnapshot;
    summaries: AdminOverviewKpiSnapshot;
    openAi: AdminOverviewCostSnapshot;
    revenueMtdUsd: number;
    failedWebhooks7Days: number;
    supportNew: number;
    feedbackNew: number;
  };
  attention: AdminOverviewAttentionItem[];
  health: {
    sentryConfigured: boolean;
    sentryUrl: string;
    summaryTrend30Days: AdminChartPoint[];
    activeUsersTrend30Days: AdminChartPoint[];
    aiSpendTrend30Days: AdminChartPoint[];
    recentWebhookFailures: AdminWebhookDeliveryRow[];
    recentSupport: AdminSupportRequestRow[];
    recentFeedback: AdminFeedbackRow[];
  };
}

export interface AdminUserRecord {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  subscriptionType: AdminPlanType;
  activityAt: string | null;
  joinedAt: string | null;
  bannedUntil: string | null;
  country: string;
}

export interface AdminUsersData {
  generatedAt: string;
  total: number;
  users: AdminUserRecord[];
}

export interface AdminRevenueBreakdownRow {
  planType: "monthly" | "annual" | "founder";
  purchases: number;
  estimatedRevenue: number;
}

export interface AdminPayoutEstimate {
  nextPayoutAt: string;
  batchCreatedAt: string;
  bankArrivalStartAt: string;
  bankArrivalEndAt: string;
  eligiblePurchases: number;
  estimatedGross: number;
  estimatedPlatformFees: number;
  estimatedPayoutFee: number;
  estimatedNet: number;
  thresholdUsd: number;
  thresholdMet: boolean;
}

export interface AdminMarketingSpendRecord {
  id: string;
  month: string;
  channel: string;
  amount: number;
  notes: string | null;
  createdAt: string;
}

export interface AdminIncomeData {
  generatedAt: string;
  currency: string;
  estimated: boolean;
  fx: {
    qarPerUsd: number;
  };
  cards: {
    today: number;
    last7Days: number;
    last30Days: number;
    overall: number;
  };
  counts: {
    proUsers: number;
    founderUsers: number;
  };
  breakdown: AdminRevenueBreakdownRow[];
  payout: AdminPayoutEstimate;
  cac: {
    currentCac: number;
    totalSpend: number;
    newCustomers: number;
  };
  marketingSpend: {
    currentMonth: number;
    totalLast30Days: number;
    entries: AdminMarketingSpendRecord[];
  };
}

export interface AdminSubscriptionEvent {
  id: string;
  userId: string;
  email: string | null;
  planType: string;
  status: string;
  eventType: "created" | "updated";
  eventAt: string;
  createdAt: string;
  updatedAt: string | null;
  reference: string;
}

export interface AdminAiUsageEvent {
  id: string;
  userId: string | null;
  model: string;
  status: "success" | "error";
  errorCode: string | null;
  inputChars: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  createdAt: string;
}

export interface AdminAiRateLimitSummary {
  peakRequestsPerMinute: number;
  recommendedRequestsPerMinute: number;
  headroom: number;
  status: AdminMetricStatus;
}

export interface AdminAiUsageData {
  generatedAt: string;
  model: string;
  totals: {
    requests24Hours: number;
    requests7Days: number;
    totalTokens7Days: number;
    avgTokensPerRequest: number;
    totalCost7Days: number;
    avgCostPerRequest: number;
    avgLatencyMs: number;
    successRate: number;
    errorRate: number;
  };
  spendTrend: AdminChartPoint[];
  tokenTrend: AdminChartPoint[];
  latencyTrend: AdminChartPoint[];
  errorBreakdown: Array<{
    code: string;
    count: number;
  }>;
  recentEvents: AdminAiUsageEvent[];
  rateLimit: AdminAiRateLimitSummary;
}

export type AdminFeedbackType =
  | "bug"
  | "feature"
  | "complaint"
  | "praise"
  | "support";
export type AdminFeedbackStatus =
  | "new"
  | "in_progress"
  | "resolved"
  | "closed";
export type AdminFeedbackPriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

export interface AdminFeedbackRow {
  id: string;
  userId: string | null;
  email: string | null;
  phone: string | null;
  type: AdminFeedbackType;
  status: AdminFeedbackStatus;
  priority: AdminFeedbackPriority;
  locale: Locale;
  subject: string;
  message: string;
  rating: string | null;
  tags: string[];
  adminNotes: string | null;
  response: string | null;
  respondedAt: string | null;
  createdAt: string;
  lastUpdatedAt: string;
}

export interface AdminFeedbackData {
  generatedAt: string;
  total: number;
  pending: number;
  resolved: number;
  critical: number;
  byType: Array<{
    type: AdminFeedbackType;
    count: number;
  }>;
  feedback: AdminFeedbackRow[];
}

export type AdminSupportStatus =
  | "new"
  | "in_progress"
  | "resolved"
  | "closed";

export type AdminInboxPriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

export interface AdminSupportRequestRow {
  id: string;
  userId: string | null;
  email: string | null;
  phone: string | null;
  status: AdminSupportStatus;
  priority: AdminInboxPriority;
  locale: Locale;
  subject: string;
  message: string;
  tags: string[];
  adminNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  lastUpdatedAt: string;
}

export interface AdminInboxData {
  generatedAt: string;
  feedback: {
    total: number;
    newCount: number;
    openCount: number;
    highPriorityCount: number;
    tags: string[];
    items: AdminFeedbackRow[];
  };
  support: {
    total: number;
    newCount: number;
    openCount: number;
    highPriorityCount: number;
    tags: string[];
    items: AdminSupportRequestRow[];
  };
}

export interface AdminOverviewAttentionItem {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  href?: string;
  ctaLabel?: string;
}

export interface AdminOverviewKpiSnapshot {
  today: number;
  last7Days: number;
  last30Days: number;
}

export interface AdminOverviewCostSnapshot {
  todayUsd: number;
  last7DaysUsd: number;
  last30DaysUsd: number;
  todayRequests: number;
  last7DaysRequests: number;
  last30DaysRequests: number;
}

export interface AdminWebhookDeliveryRow {
  id: string;
  provider: string;
  eventName: string | null;
  externalId: string | null;
  status: "processed" | "failed" | "rejected";
  httpStatus: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
}
