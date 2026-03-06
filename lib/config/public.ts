const PUBLIC_LS_ENV = {
  NEXT_PUBLIC_LS_MONTHLY_VARIANT: process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT ?? "",
  NEXT_PUBLIC_LS_ANNUAL_VARIANT: process.env.NEXT_PUBLIC_LS_ANNUAL_VARIANT ?? "",
  NEXT_PUBLIC_LS_FOUNDER_VARIANT: process.env.NEXT_PUBLIC_LS_FOUNDER_VARIANT ?? "",
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
