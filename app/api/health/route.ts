import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function hasNonEmptyEnvValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function getEnvStatus() {
  return {
    supabase:
      hasNonEmptyEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      hasNonEmptyEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    openai: hasNonEmptyEnvValue(process.env.OPENAI_API_KEY),
    // Paddle is the active payment provider. Check both API key (server) and price IDs (public).
    paddle:
      hasNonEmptyEnvValue(process.env.PADDLE_API_KEY) &&
      hasNonEmptyEnvValue(process.env.PADDLE_WEBHOOK_SECRET) &&
      hasNonEmptyEnvValue(process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID) &&
      hasNonEmptyEnvValue(process.env.NEXT_PUBLIC_PADDLE_ANNUAL_PRICE_ID) &&
      hasNonEmptyEnvValue(process.env.NEXT_PUBLIC_PADDLE_FOUNDER_PRICE_ID),
    // Lemon Squeezy check kept for transitional coexistence (legacy webhook handler still present).
    // Can be removed once LS files are deleted.
    lemonsqueezy:
      hasNonEmptyEnvValue(process.env.LEMONSQUEEZY_WEBHOOK_SECRET) ||
      hasNonEmptyEnvValue(process.env.LEMON_SIGNING_SECRET),
  };
}

export async function GET() {
  const env = getEnvStatus();
  const envConfigured = Object.values(env).every(Boolean);

  return NextResponse.json(
    {
      ok: envConfigured,
      env,
      envConfigured,
    },
    { status: envConfigured ? 200 : 503 }
  );
}
