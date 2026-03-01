import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getEnvStatus() {
  const supabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const openai = Boolean(process.env.OPENAI_API_KEY);
  const lemonsqueezy = Boolean(
    (process.env.LEMONSQUEEZY_WEBHOOK_SECRET || process.env.LEMON_SIGNING_SECRET) &&
      process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT
  );

  return {
    supabase,
    openai,
    lemonsqueezy,
  };
}

export async function GET() {
  const env = getEnvStatus();

  return NextResponse.json(
    {
      ok: true,
      timestamp: new Date().toISOString(),
      app: "fazumi-web",
      env,
      envConfigured: env.supabase && env.openai,
    },
    { status: 200 }
  );
}
