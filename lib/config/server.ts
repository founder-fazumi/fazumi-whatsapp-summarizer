const REQUIRED_RUNTIME_ENV = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "CRON_SECRET",
] as const;

const REQUIRED_BILLING_PUBLIC_ENV = [
  "NEXT_PUBLIC_LS_MONTHLY_VARIANT",
  "NEXT_PUBLIC_LS_ANNUAL_VARIANT",
  "NEXT_PUBLIC_LS_FOUNDER_VARIANT",
] as const;

let hasValidated = false;

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

export function validateServerRuntimeEnv() {
  if (
    hasValidated ||
    process.env.NODE_ENV === "test" ||
    process.env.PLAYWRIGHT_TEST === "1"
  ) {
    return;
  }

  hasValidated = true;

  const missing: string[] = [];

  for (const name of REQUIRED_RUNTIME_ENV) {
    if (!hasValue(process.env[name])) {
      missing.push(name);
    }
  }

  for (const name of REQUIRED_BILLING_PUBLIC_ENV) {
    if (!hasValue(process.env[name])) {
      missing.push(name);
    }
  }

  const hasWebhookSecret =
    hasValue(process.env.LEMONSQUEEZY_WEBHOOK_SECRET) ||
    hasValue(process.env.LEMON_SIGNING_SECRET);

  if (!hasWebhookSecret) {
    missing.push("LEMONSQUEEZY_WEBHOOK_SECRET (or LEMON_SIGNING_SECRET)");
  }

  if (missing.length === 0) {
    return;
  }

  const message = `[env] Missing required runtime env vars: ${missing.join(", ")}`;

  // Warn only — never throw. A missing env var should degrade individual
  // features at request time, not crash the entire server at startup.
  console.error(message);
}
