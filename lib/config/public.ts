const PUBLIC_LS_ENV = {
  NEXT_PUBLIC_LS_MONTHLY_VARIANT: process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT ?? "88092b82-a18d-4297-9854-23620e4560d2",
  NEXT_PUBLIC_LS_ANNUAL_VARIANT: process.env.NEXT_PUBLIC_LS_ANNUAL_VARIANT ?? "a5724bda-653d-45f5-a3f8-6b5be250e8d5",
  NEXT_PUBLIC_LS_FOUNDER_VARIANT: process.env.NEXT_PUBLIC_LS_FOUNDER_VARIANT ?? "b3ec4775-5f54-4784-8b5c-0d6bd66a6bc1",
} as const;

function normalizePublicValue(value: string) {
  return value.trim();
}

const monthly = normalizePublicValue(PUBLIC_LS_ENV.NEXT_PUBLIC_LS_MONTHLY_VARIANT);
const annual = normalizePublicValue(PUBLIC_LS_ENV.NEXT_PUBLIC_LS_ANNUAL_VARIANT);
const founder = normalizePublicValue(PUBLIC_LS_ENV.NEXT_PUBLIC_LS_FOUNDER_VARIANT);

export const lsVariantIds: { monthly?: string; annual?: string; founder?: string } = {
  ...(monthly ? { monthly } : {}),
  ...(annual ? { annual } : {}),
  ...(founder ? { founder } : {}),
};

export const lsVariantsConfigured = Boolean(
  lsVariantIds.monthly && lsVariantIds.annual && lsVariantIds.founder
);

export const missingLsVariantEnvVars = Object.entries(PUBLIC_LS_ENV)
  .filter(([, value]) => normalizePublicValue(value).length === 0)
  .map(([name]) => name);

// Backward-compatible aliases for existing imports.
export const publicBillingConfig = {
  monthlyVariantId: lsVariantIds.monthly ?? "",
  annualVariantId: lsVariantIds.annual ?? "",
  founderVariantId: lsVariantIds.founder ?? "",
};

export const missingBillingEnvVars = missingLsVariantEnvVars;
export const billingConfigured = lsVariantsConfigured;
