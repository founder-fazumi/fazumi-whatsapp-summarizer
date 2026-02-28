import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getEnvStatus() {
  return {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
  };
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      app: "fazumi-web",
      env: getEnvStatus(),
    },
    { status: 200 }
  );
}
