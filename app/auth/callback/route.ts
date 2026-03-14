import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectPath } from "@/lib/auth/safe-redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const safeNext = sanitizeRedirectPath(next, "/dashboard");
  const isRecoveryFlow = safeNext.startsWith("/reset-password");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const configuredHost = (() => {
    try {
      return configuredAppUrl ? new URL(configuredAppUrl).host : null;
    } catch {
      return null;
    }
  })();
  const trustedForwardedHost =
    forwardedHost && configuredHost && forwardedHost === configuredHost
      ? forwardedHost
      : null;
  const redirectOrigin =
    !isLocalEnv && trustedForwardedHost
      ? `https://${trustedForwardedHost}`
      : origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${redirectOrigin}${safeNext}`);
    }
  }

  if (isRecoveryFlow) {
    return NextResponse.redirect(`${redirectOrigin}/login?error=recovery_failed`);
  }

  // Auth failed — redirect to login with error flag
  return NextResponse.redirect(`${redirectOrigin}/login?error=auth_failed&next=${encodeURIComponent(safeNext)}`);
}
