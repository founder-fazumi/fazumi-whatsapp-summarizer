// ── Lemon Squeezy (deprecated — kept for backward compatibility) ────────────

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

// ── Paddle (active payment provider) ─────────────────────────────────────────

const PUBLIC_PADDLE_ENV = {
  NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID ?? "",
  NEXT_PUBLIC_PADDLE_ANNUAL_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_ANNUAL_PRICE_ID ?? "",
  NEXT_PUBLIC_PADDLE_FOUNDER_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_FOUNDER_PRICE_ID ?? "",
} as const;

const paddleMonthly = normalizePublicValue(PUBLIC_PADDLE_ENV.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID);
const paddleAnnual = normalizePublicValue(PUBLIC_PADDLE_ENV.NEXT_PUBLIC_PADDLE_ANNUAL_PRICE_ID);
const paddleFounder = normalizePublicValue(PUBLIC_PADDLE_ENV.NEXT_PUBLIC_PADDLE_FOUNDER_PRICE_ID);

export const paddlePriceIds: { monthly?: string; annual?: string; founder?: string } = {
  ...(paddleMonthly ? { monthly: paddleMonthly } : {}),
  ...(paddleAnnual ? { annual: paddleAnnual } : {}),
  ...(paddleFounder ? { founder: paddleFounder } : {}),
};

export const paddleConfigured = Boolean(
  paddlePriceIds.monthly && paddlePriceIds.annual && paddlePriceIds.founder
);

export const missingPaddleEnvVars = Object.entries(PUBLIC_PADDLE_ENV)
  .filter(([, value]) => normalizePublicValue(value).length === 0)
  .map(([name]) => name);
