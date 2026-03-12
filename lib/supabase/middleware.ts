import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  ADMIN_HOME_PATH,
  ADMIN_LOGIN_API_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_LOGOUT_API_PATH,
  hasAdminSession,
  isAdminDashboardEnabled,
  isAdminLoginPath,
  isAdminRoutePath,
  sanitizeAdminNextPath,
} from "@/lib/admin/auth";
import { filterMalformedSupabaseAuthCookies } from "@/lib/supabase/auth-cookies";
import { CONSENT_REGION_COOKIE } from "@/lib/compliance/gdpr";

const PROTECTED_PATHS = [
  "/dashboard",
  "/summarize",
  "/history",
  "/calendar",
  "/settings",
  "/billing",
  "/profile",
];

function withConsentRegionCookie(request: NextRequest, response: NextResponse) {
  const countryCode =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry");

  if (!countryCode) {
    return response;
  }

  response.cookies.set(CONSENT_REGION_COOKIE, countryCode.toUpperCase(), {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

function withSupabaseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });

  return target;
}

function isRecoverableSupabaseCookieError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("cannot create property 'user' on string") ||
    message.includes('cannot create property "user" on string')
  );
}

function createAdminLoginRedirect(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  const nextPath = sanitizeAdminNextPath(
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );

  loginUrl.pathname = ADMIN_LOGIN_PATH;
  loginUrl.search = "";
  loginUrl.searchParams.set("next", nextPath);

  return loginUrl;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  const isAdminApi = path.startsWith("/api/admin");
  const isAdminAuthApi =
    path === ADMIN_LOGIN_API_PATH || path === ADMIN_LOGOUT_API_PATH;
  const isAdminPage = isAdminRoutePath(path);
  const isAdminLogin = isAdminLoginPath(path);

  if (isAdminApi && !isAdminAuthApi) {
    if (!isAdminDashboardEnabled()) {
      return withConsentRegionCookie(
        request,
        NextResponse.json({ ok: false, error: "Not found." }, { status: 404 })
      );
    }

    if (!(await hasAdminSession(request.cookies))) {
      return withConsentRegionCookie(
        request,
        NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 })
      );
    }

    return withConsentRegionCookie(request, supabaseResponse);
  }

  if (isAdminPage) {
    if (!isAdminDashboardEnabled()) {
      return withConsentRegionCookie(request, supabaseResponse);
    }

    if (isAdminLogin) {
      if (await hasAdminSession(request.cookies)) {
        const targetUrl = request.nextUrl.clone();
        targetUrl.pathname = ADMIN_HOME_PATH;
        targetUrl.search = "";

        return withConsentRegionCookie(request, NextResponse.redirect(targetUrl));
      }

      return withConsentRegionCookie(request, supabaseResponse);
    }

    if (!(await hasAdminSession(request.cookies))) {
      return withConsentRegionCookie(
        request,
        NextResponse.redirect(createAdminLoginRedirect(request))
      );
    }

    return withConsentRegionCookie(request, supabaseResponse);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return withConsentRegionCookie(request, supabaseResponse);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return filterMalformedSupabaseAuthCookies(request.cookies.getAll());
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  let user = null;

  try {
    const {
      data: { user: nextUser },
    } = await supabase.auth.getUser();
    user = nextUser;
  } catch (error) {
    if (!isRecoverableSupabaseCookieError(error)) {
      throw error;
    }
  }

  const isProtected = PROTECTED_PATHS.some((protectedPath) =>
    path.startsWith(protectedPath)
  );

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", path);
    return withConsentRegionCookie(
      request,
      withSupabaseCookies(supabaseResponse, NextResponse.redirect(loginUrl))
    );
  }

  if (path === "/login" && user) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return withConsentRegionCookie(
      request,
      withSupabaseCookies(supabaseResponse, NextResponse.redirect(dashboardUrl))
    );
  }

  return withConsentRegionCookie(request, supabaseResponse);
}
