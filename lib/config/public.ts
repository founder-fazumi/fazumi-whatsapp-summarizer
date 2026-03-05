const REQUIRED_BILLING_ENV = {
  NEXT_PUBLIC_LS_MONTHLY_VARIANT: process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT ?? "",
  NEXT_PUBLIC_LS_ANNUAL_VARIANT: process.env.NEXT_PUBLIC_LS_ANNUAL_VARIANT ?? "",
  NEXT_PUBLIC_LS_FOUNDER_VARIANT: process.env.NEXT_PUBLIC_LS_FOUNDER_VARIANT ?? "",
} as const;

function normalizePublicValue(value: string) {
  return value.trim();
}

export const publicBillingConfig = {
  monthlyVariantId: normalizePublicValue(REQUIRED_BILLING_ENV.NEXT_PUBLIC_LS_MONTHLY_VARIANT),
  annualVariantId: normalizePublicValue(REQUIRED_BILLING_ENV.NEXT_PUBLIC_LS_ANNUAL_VARIANT),
  founderVariantId: normalizePublicValue(REQUIRED_BILLING_ENV.NEXT_PUBLIC_LS_FOUNDER_VARIANT),
};

export const missingBillingEnvVars = Object.entries(REQUIRED_BILLING_ENV)
  .filter(([, value]) => normalizePublicValue(value).length === 0)
  .map(([name]) => name);

export const billingConfigured = missingBillingEnvVars.length === 0;
