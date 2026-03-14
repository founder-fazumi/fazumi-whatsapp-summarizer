import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

function isLocalRequest(request: NextRequest) {
  const hostname =
    request.nextUrl.hostname?.trim().toLowerCase() ??
    request.headers.get("host")?.trim().toLowerCase() ??
    "";

  return Boolean(hostname) && LOCAL_HOSTS.has(hostname);
}

function getEnvStatus() {
  return {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
  };
}

function getMissingEnvNames(env: ReturnType<typeof getEnvStatus>) {
  const missing: string[] = [];

  if (!env.supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!env.supabaseAnon) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!env.openai) missing.push("OPENAI_API_KEY");

  return missing;
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  if (!isLocalRequest(request)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
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
