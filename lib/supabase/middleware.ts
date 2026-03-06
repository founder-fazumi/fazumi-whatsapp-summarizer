import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  ADMIN_HOME_PATH,
  ADMIN_LOGIN_PATH,
  isAdminDashboardEnabled,
} from "@/lib/admin/auth";
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
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

function withSupabaseCookies(
  source: NextResponse,
  target: NextResponse
) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });

  return target;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  const isAdminPage = path.startsWith("/admin_dashboard");
  const isAdminLogin = path === ADMIN_LOGIN_PATH;
  const isAdminApi = path.startsWith("/api/admin");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (isAdminApi) {
      return withConsentRegionCookie(
        request,
        NextResponse.json({ ok: false, error: "Not found." }, { status: 404 })
      );
    }

    return withConsentRegionCookie(request, supabaseResponse);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  async function isCurrentUserAdmin() {
    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: string | null }>();

    if (error) {
      return (
        typeof user.app_metadata?.role === "string" &&
        user.app_metadata.role === "admin"
      );
    }

    return (
      data?.role === "admin" ||
      (typeof user.app_metadata?.role === "string" &&
        user.app_metadata.role === "admin")
    );
  }

  if (isAdminApi) {
    if (!isAdminDashboardEnabled()) {
      return withConsentRegionCookie(
        request,
        withSupabaseCookies(
          supabaseResponse,
          NextResponse.json({ ok: false, error: "Not found." }, { status: 404 })
        )
      );
    }

    if (!user) {
      return withConsentRegionCookie(
        request,
        withSupabaseCookies(
          supabaseResponse,
          NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 })
        )
      );
    }

    if (!(await isCurrentUserAdmin())) {
      return withConsentRegionCookie(
        request,
        withSupabaseCookies(
          supabaseResponse,
          NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 })
        )
      );
    }

    return withConsentRegionCookie(request, supabaseResponse);
  }

  if (isAdminPage) {
    if (!isAdminDashboardEnabled()) {
      const fallbackUrl = request.nextUrl.clone();
      fallbackUrl.pathname = user ? "/dashboard" : "/login";
      fallbackUrl.search = "";
      return withConsentRegionCookie(
        request,
        withSupabaseCookies(supabaseResponse, NextResponse.redirect(fallbackUrl))
      );
    }

    if (!user && !isAdminLogin) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", path);
      return withConsentRegionCookie(
        request,
        withSupabaseCookies(supabaseResponse, NextResponse.redirect(loginUrl))
      );
    }

    if (user) {
      const isAdmin = await isCurrentUserAdmin();

      if (isAdminLogin) {
        const targetUrl = request.nextUrl.clone();
        targetUrl.pathname = isAdmin ? ADMIN_HOME_PATH : "/dashboard";
        targetUrl.search = "";
        return withConsentRegionCookie(
          request,
          withSupabaseCookies(supabaseResponse, NextResponse.redirect(targetUrl))
        );
      }

      if (!isAdmin) {
        const fallbackUrl = request.nextUrl.clone();
        fallbackUrl.pathname = "/dashboard";
        fallbackUrl.search = "";
        return withConsentRegionCookie(
          request,
          withSupabaseCookies(supabaseResponse, NextResponse.redirect(fallbackUrl))
        );
      }
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
