export const DAILY_LIMIT_PAID = 50;
export const FREE_LIFETIME_CAP = 3;

export const LIMITS: Record<string, number> = {
  monthly: DAILY_LIMIT_PAID,
  annual: DAILY_LIMIT_PAID,
  founder: DAILY_LIMIT_PAID,
  trial: 3,
  free: 0,
};

export function getDailyLimit(tierKey: string): number {
  return LIMITS[tierKey] ?? 0;
}

export function getTierKey(plan: string | null | undefined, trialExpiresAt: string | null | undefined): string {
  if (plan === "monthly" || plan === "annual" || plan === "founder") {
    return plan;
  }

  if (trialExpiresAt && new Date(trialExpiresAt) > new Date()) {
    return "trial";
  }

  return "free";
}
