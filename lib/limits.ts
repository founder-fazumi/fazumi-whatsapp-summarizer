export const DAILY_LIMIT_PAID = 50;
export const FREE_LIFETIME_CAP = 3;

export const PAID_PLANS = ["monthly", "annual", "founder"] as const;
export const LIMITS = {
  monthly: DAILY_LIMIT_PAID,
  annual: DAILY_LIMIT_PAID,
  founder: DAILY_LIMIT_PAID,
  trial: 3,
  free: 0,
} as const;

export type PaidPlan = (typeof PAID_PLANS)[number];
export type TierKey = keyof typeof LIMITS;
export type PlanKey = PaidPlan | "free";

export type EntitlementProfile = {
  plan?: string | null;
  trial_expires_at?: string | null;
};

export type EntitlementSubscription = {
  plan_type?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  ls_customer_portal_url?: string | null;
  ls_update_payment_method_url?: string | null;
  ls_subscription_id?: string | null;
  ls_order_id?: string | null;
  // Paddle fields — optional, absent for LS-only rows
  paddle_subscription_id?: string | null;
  paddle_transaction_id?: string | null;
  paddle_management_url?: string | null;
};

export type ResolvedEntitlement = {
  tierKey: TierKey;
  effectivePlan: PlanKey;
  billingPlan: PlanKey;
  hasPaidAccess: boolean;
  isTrialActive: boolean;
  source: "subscription" | "profile" | "trial" | "free";
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  customerPortalUrl: string | null;
  updatePaymentMethodUrl: string | null;
  subscriptionId: string | null;
  orderId: string | null;
};

export function getDailyLimit(tierKey: string): number {
  return LIMITS[tierKey as TierKey] ?? 0;
}

export function getUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function isPaidPlan(plan: string | null | undefined): plan is PaidPlan {
  return PAID_PLANS.includes(plan as PaidPlan);
}

export function isTrialActive(
  trialExpiresAt: string | null | undefined,
  now = new Date()
) {
  return Boolean(trialExpiresAt && new Date(trialExpiresAt) > now);
}

function getSubscriptionSortTime(subscription: EntitlementSubscription) {
  const candidate =
    subscription.updated_at ??
    subscription.created_at ??
    subscription.current_period_end ??
    null;

  if (!candidate) {
    return 0;
  }

  const timestamp = new Date(candidate).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortSubscriptionsByRecency(
  left: EntitlementSubscription,
  right: EntitlementSubscription
) {
  return getSubscriptionSortTime(right) - getSubscriptionSortTime(left);
}

function pickRelevantPaidSubscription(
  subscriptions: readonly EntitlementSubscription[]
): EntitlementSubscription | null {
  const paidSubscriptions = subscriptions.filter((subscription) =>
    isPaidPlan(subscription.plan_type)
  );

  if (paidSubscriptions.length === 0) {
    return null;
  }

  const activeFounder = paidSubscriptions
    .filter(
      (subscription) =>
        subscription.plan_type === "founder" && subscription.status === "active"
    )
    .sort(sortSubscriptionsByRecency)[0];

  if (activeFounder) {
    return activeFounder;
  }

  const recurringPaidSubscriptions = paidSubscriptions.filter(
    (subscription) =>
      (typeof subscription.ls_subscription_id === "string" && subscription.ls_subscription_id.length > 0) ||
      (typeof subscription.paddle_subscription_id === "string" && subscription.paddle_subscription_id.length > 0)
  );
  const candidates = recurringPaidSubscriptions.length > 0
    ? recurringPaidSubscriptions
    : paidSubscriptions;

  const activePaid = candidates
    .filter((subscription) => subscription.status === "active")
    .sort(sortSubscriptionsByRecency)[0];

  if (activePaid) {
    return activePaid;
  }

  return [...candidates].sort(sortSubscriptionsByRecency)[0] ?? null;
}

export function resolveEntitlement(params: {
  profile?: EntitlementProfile | null;
  subscriptions?: readonly EntitlementSubscription[] | null;
  now?: Date;
}): ResolvedEntitlement {
  const now = params.now ?? new Date();
  const profile = params.profile ?? null;
  const subscriptions = params.subscriptions ?? [];
  const subscription = pickRelevantPaidSubscription(subscriptions);
  const trialActive = isTrialActive(profile?.trial_expires_at, now);

  if (subscription && isPaidPlan(subscription.plan_type)) {
    const billingPlan = subscription.plan_type;
    const shared = {
      billingPlan,
      subscriptionStatus: subscription.status ?? null,
      currentPeriodEnd: subscription.current_period_end ?? null,
      customerPortalUrl: subscription.ls_customer_portal_url ?? subscription.paddle_management_url ?? null,
      updatePaymentMethodUrl: subscription.ls_update_payment_method_url ?? subscription.paddle_management_url ?? null,
      subscriptionId: subscription.ls_subscription_id ?? subscription.paddle_subscription_id ?? null,
      orderId: subscription.ls_order_id ?? subscription.paddle_transaction_id ?? null,
    } as const;

    // active    = normal paid state
    // past_due  = payment retry window; Paddle retries automatically before
    //             moving to canceled — preserve access during that window.
    //             This also correctly grants LS past_due users a grace period.
    if (subscription.status === "active" || subscription.status === "past_due") {
      return {
        tierKey: billingPlan,
        effectivePlan: billingPlan,
        hasPaidAccess: true,
        isTrialActive: false,
        source: "subscription",
        ...shared,
      };
    }

    if (trialActive) {
      return {
        tierKey: "trial",
        effectivePlan: "free",
        hasPaidAccess: false,
        isTrialActive: true,
        source: "trial",
        ...shared,
      };
    }

    return {
      tierKey: "free",
      effectivePlan: "free",
      hasPaidAccess: false,
      isTrialActive: false,
      source: "subscription",
      ...shared,
    };
  }

  if (isPaidPlan(profile?.plan)) {
    return {
      tierKey: profile.plan,
      effectivePlan: profile.plan,
      billingPlan: profile.plan,
      hasPaidAccess: true,
      isTrialActive: false,
      source: "profile",
      subscriptionStatus: null,
      currentPeriodEnd: null,
      customerPortalUrl: null,
      updatePaymentMethodUrl: null,
      subscriptionId: null,
      orderId: null,
    };
  }

  if (trialActive) {
    return {
      tierKey: "trial",
      effectivePlan: "free",
      billingPlan: "free",
      hasPaidAccess: false,
      isTrialActive: true,
      source: "trial",
      subscriptionStatus: null,
      currentPeriodEnd: null,
      customerPortalUrl: null,
      updatePaymentMethodUrl: null,
      subscriptionId: null,
      orderId: null,
    };
  }

  return {
    tierKey: "free",
    effectivePlan: "free",
    billingPlan: "free",
    hasPaidAccess: false,
    isTrialActive: false,
    source: "free",
    subscriptionStatus: null,
    currentPeriodEnd: null,
    customerPortalUrl: null,
    updatePaymentMethodUrl: null,
    subscriptionId: null,
    orderId: null,
  };
}

export function getTierKey(
  plan: string | null | undefined,
  trialExpiresAt: string | null | undefined
): TierKey {
  if (isPaidPlan(plan)) {
    return plan;
  }

  if (isTrialActive(trialExpiresAt)) {
    return "trial";
  }

  return "free";
}



