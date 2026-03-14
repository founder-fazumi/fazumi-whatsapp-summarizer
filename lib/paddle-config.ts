// lib/paddle-config.ts
// Paddle plan/price configuration.
// Safe to import anywhere — reads only NEXT_PUBLIC_PADDLE_* env vars.
// Does not affect live behaviour until checkout + webhook routes are updated to use it.

export type PlanType = "monthly" | "annual" | "founder";

export type PriceIdEnvName =
  | "NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID"
  | "NEXT_PUBLIC_PADDLE_ANNUAL_PRICE_ID"
  | "NEXT_PUBLIC_PADDLE_FOUNDER_PRICE_ID";

export type PaddlePriceState = "ready" | "missing" | "invalid";
export type PaddleEnvironment = "sandbox" | "production";

export interface PaddlePriceConfig {
  plan: PlanType;
  envName: PriceIdEnvName;
  priceId: string;
  state: PaddlePriceState;
}

// ── env reads ──────────────────────────────────────────────────────────────────

const ENV_NAMES: Record<PlanType, PriceIdEnvName> = {
  monthly: "NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID",
  annual:  "NEXT_PUBLIC_PADDLE_ANNUAL_PRICE_ID",
  founder: "NEXT_PUBLIC_PADDLE_FOUNDER_PRICE_ID",
};

const RAW_PRICE_IDS: Record<PlanType, string> = {
  monthly: process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID ?? "",
  annual:  process.env.NEXT_PUBLIC_PADDLE_ANNUAL_PRICE_ID  ?? "",
  founder: process.env.NEXT_PUBLIC_PADDLE_FOUNDER_PRICE_ID ?? "",
};

// ── helpers ────────────────────────────────────────────────────────────────────

export function normalizePriceId(value?: string | null): string {
  return value?.trim() ?? "";
}

// Paddle price IDs always start with "pri_" followed by alphanumeric characters.
export function isValidPaddlePriceId(value?: string | null): boolean {
  const normalized = normalizePriceId(value);
  if (!normalized) return false;
  return /^pri_[a-zA-Z0-9]+$/.test(normalized);
}

export function getPaddleEnvironment(): PaddleEnvironment {
  const raw = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT?.trim();
  return raw === "production" ? "production" : "sandbox";
}

// ── per-plan config ────────────────────────────────────────────────────────────

export function getPaddlePriceConfig(plan: PlanType): PaddlePriceConfig {
  const priceId = normalizePriceId(RAW_PRICE_IDS[plan]);
  return {
    plan,
    envName: ENV_NAMES[plan],
    priceId,
    state: !priceId
      ? "missing"
      : isValidPaddlePriceId(priceId)
        ? "ready"
        : "invalid",
  };
}

export function getAllPaddlePriceConfigs(): PaddlePriceConfig[] {
  return (Object.keys(ENV_NAMES) as PlanType[]).map(getPaddlePriceConfig);
}

// Look up plan type from a price ID received in a webhook or checkout response.
export function getPlanTypeFromPriceId(priceId?: string | null): PlanType | null {
  const normalized = normalizePriceId(priceId);
  if (!normalized) return null;
  const match = getAllPaddlePriceConfigs().find(
    (c) => c.state === "ready" && c.priceId === normalized
  );
  return match?.plan ?? null;
}

// ── readiness guards ───────────────────────────────────────────────────────────

// True only when all three plans have a valid price ID set.
export function isPaddleFullyConfigured(): boolean {
  return getAllPaddlePriceConfigs().every((c) => c.state === "ready");
}

// Summary for health checks and debug logging.
export function getPaddleConfigSummary() {
  const configs = getAllPaddlePriceConfigs();
  return {
    environment: getPaddleEnvironment(),
    configs,
    ready:   configs.filter((c) => c.state === "ready"),
    missing: configs.filter((c) => c.state === "missing"),
    invalid: configs.filter((c) => c.state === "invalid"),
    fullyConfigured: configs.every((c) => c.state === "ready"),
  };
}
