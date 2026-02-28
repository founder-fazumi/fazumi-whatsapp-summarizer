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

function getMissingEnvNames(env: ReturnType<typeof getEnvStatus>) {
  const missing: string[] = [];

  if (!env.supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!env.supabaseAnon) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!env.serviceRole) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!env.openai) missing.push("OPENAI_API_KEY");

  return missing;
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const env = getEnvStatus();
  const missing = getMissingEnvNames(env);

  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      app: "fazumi-web",
      env,
      hint: missing.length > 0 ? `Missing ${missing.join(", ")}` : null,
    },
    { status: 200 }
  );
}
