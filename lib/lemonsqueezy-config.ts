export type PlanType = "monthly" | "annual" | "founder";

export type VariantEnvName =
  | "NEXT_PUBLIC_LS_MONTHLY_VARIANT"
  | "NEXT_PUBLIC_LS_ANNUAL_VARIANT"
  | "NEXT_PUBLIC_LS_FOUNDER_VARIANT";

export type CheckoutVariantState = "ready" | "missing" | "invalid";

export interface CheckoutVariantConfig {
  plan: PlanType;
  envName: VariantEnvName;
  variantId: string;
  state: CheckoutVariantState;
}

export const DEV_VARIANT_IDS = {
  monthly: "fazumi_dev_monthly_variant",
  annual: "fazumi_dev_annual_variant",
  founder: "fazumi_dev_founder_variant",
} as const;

const PUBLIC_VARIANT_IDS = {
  monthly: process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT ?? "",
  annual: process.env.NEXT_PUBLIC_LS_ANNUAL_VARIANT ?? "",
  founder: process.env.NEXT_PUBLIC_LS_FOUNDER_VARIANT ?? "",
} as const satisfies Record<PlanType, string>;

const ENV_NAMES = {
  monthly: "NEXT_PUBLIC_LS_MONTHLY_VARIANT",
  annual: "NEXT_PUBLIC_LS_ANNUAL_VARIANT",
  founder: "NEXT_PUBLIC_LS_FOUNDER_VARIANT",
} as const satisfies Record<PlanType, VariantEnvName>;

const DEV_VARIANT_SET = new Set<string>(Object.values(DEV_VARIANT_IDS));

export function normalizeVariantId(value?: string | null) {
  return value?.trim() ?? "";
}

export function isValidCheckoutVariantId(value?: string | null) {
  const normalized = normalizeVariantId(value);

  if (!normalized) {
    return false;
  }

  if (process.env.NODE_ENV !== "production" && DEV_VARIANT_SET.has(normalized)) {
    return true;
  }

  return /^\d+$/.test(normalized);
}

export function getCheckoutVariantConfig(plan: PlanType): CheckoutVariantConfig {
  const variantId = normalizeVariantId(PUBLIC_VARIANT_IDS[plan]);

  return {
    plan,
    envName: ENV_NAMES[plan],
    variantId,
    state: !variantId
      ? "missing"
      : isValidCheckoutVariantId(variantId)
        ? "ready"
        : "invalid",
  };
}

export function getCheckoutVariantConfigs() {
  return (Object.keys(PUBLIC_VARIANT_IDS) as PlanType[]).map((plan) =>
    getCheckoutVariantConfig(plan)
  );
}

export function findCheckoutVariantConfig(variantId?: string | null) {
  const normalized = normalizeVariantId(variantId);

  if (!normalized) {
    return null;
  }

  return (
    getCheckoutVariantConfigs().find(
      (config) => config.state === "ready" && config.variantId === normalized
    ) ?? null
  );
}

export function getCheckoutConfigSummary() {
  const configs = getCheckoutVariantConfigs();

  return {
    configs,
    ready: configs.filter((config) => config.state === "ready"),
    missing: configs.filter((config) => config.state === "missing"),
    invalid: configs.filter((config) => config.state === "invalid"),
  };
}
