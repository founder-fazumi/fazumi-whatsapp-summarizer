import { NextResponse } from "next/server";

interface PreflightBody {
  url?: unknown;
  provider?: unknown;
}

const SUPPORTED_PROVIDERS = new Set(["google", "apple"]);

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return NextResponse.json({ code: "supabase_not_configured" }, { status: 500 });
  }

  let body: PreflightBody;
  try {
    body = (await request.json()) as PreflightBody;
  } catch {
    return NextResponse.json({ code: "invalid_request" }, { status: 400 });
  }

  const provider = typeof body.provider === "string" ? body.provider : "";
  const rawUrl = typeof body.url === "string" ? body.url : "";

  if (!SUPPORTED_PROVIDERS.has(provider) || !rawUrl) {
    return NextResponse.json({ code: "invalid_request" }, { status: 400 });
  }

  let authorizeUrl: URL;
  let expectedSupabaseUrl: URL;

  try {
    authorizeUrl = new URL(rawUrl);
    expectedSupabaseUrl = new URL(supabaseUrl);
  } catch {
    return NextResponse.json({ code: "invalid_request" }, { status: 400 });
  }

  const isValidAuthorizeUrl =
    authorizeUrl.protocol === "https:" &&
    authorizeUrl.origin === expectedSupabaseUrl.origin &&
    authorizeUrl.pathname === "/auth/v1/authorize" &&
    authorizeUrl.searchParams.get("provider") === provider;

  if (!isValidAuthorizeUrl) {
    return NextResponse.json({ code: "invalid_authorize_url" }, { status: 400 });
  }

  try {
    const response = await fetch(authorizeUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      return NextResponse.json({ ok: true });
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = (await response.json().catch(() => null)) as { msg?: string } | null;
      const message = payload?.msg?.toLowerCase() ?? "";

      if (message.includes("provider is not enabled")) {
        return NextResponse.json({ code: "provider_not_enabled" }, { status: 409 });
      }
    }

    return NextResponse.json({ code: "oauth_start_failed" }, { status: 502 });
  } catch {
    return NextResponse.json({ code: "oauth_start_failed" }, { status: 502 });
  }
}
