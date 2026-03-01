import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function hasRequiredEnv() {
  return Boolean(
    process.env.OPENAI_API_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET &&
    process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT
  );
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      timestamp: new Date().toISOString(),
      app: "fazumi-web",
      envConfigured: hasRequiredEnv(),
    },
    { status: 200 }
  );
}
