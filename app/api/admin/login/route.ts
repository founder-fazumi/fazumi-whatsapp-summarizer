import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_HOME_PATH,
  createAdminSessionToken,
  getAdminCookieOptions,
  getAdminCredentials,
  getRequestIp,
  isAdminDashboardEnabled,
  isValidAdminRequestOrigin,
} from "@/lib/admin/auth";
import {
  consumeAdminLoginRateLimit,
  resetAdminLoginRateLimit,
} from "@/lib/admin/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminLoginPayload = {
  password?: unknown;
  username?: unknown;
};

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function safeEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();

  return timingSafeEqual(leftHash, rightHash);
}

export async function POST(request: NextRequest) {
  if (!isAdminDashboardEnabled()) {
    return noStore(
      NextResponse.json({ ok: false, error: "Not found." }, { status: 404 })
    );
  }

  if (!isValidAdminRequestOrigin(request)) {
    return noStore(
      NextResponse.json({ ok: false, error: "Invalid request." }, { status: 403 })
    );
  }

  const rateLimit = consumeAdminLoginRateLimit(getRequestIp(request));

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { ok: false, error: "Too many attempts." },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return noStore(response);
  }

  let body: AdminLoginPayload;

  try {
    body = (await request.json()) as AdminLoginPayload;
  } catch {
    return noStore(
      NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 })
    );
  }

  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const expected = getAdminCredentials();

  if (!expected) {
    return noStore(
      NextResponse.json({ ok: false, error: "Not found." }, { status: 404 })
    );
  }

  if (
    !username ||
    !password ||
    username.length > 128 ||
    password.length > 512 ||
    !safeEqual(username, expected.username) ||
    !safeEqual(password, expected.password)
  ) {
    return noStore(
      NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 })
    );
  }

  resetAdminLoginRateLimit(getRequestIp(request));

  const response = NextResponse.json({
    ok: true,
    redirectTo: ADMIN_HOME_PATH,
  });

  response.cookies.set(
    ADMIN_COOKIE_NAME,
    await createAdminSessionToken(),
    getAdminCookieOptions()
  );

  return noStore(response);
}
