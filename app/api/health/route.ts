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
