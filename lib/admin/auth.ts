import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export const ADMIN_LOGIN_PATH = "/admin/login";
export const LEGACY_ADMIN_LOGIN_PATH = "/admin_dashboard/login";
export const ADMIN_HOME_PATH = "/admin_dashboard";
export const ADMIN_COOKIE_NAME = "fazumi_admin";
export const ADMIN_LOGIN_API_PATH = "/api/admin/login";
export const ADMIN_LOGOUT_API_PATH = "/api/admin/logout";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

type CookieStoreReader = {
  get(name: string): { value: string } | undefined;
};

type AdminSessionPayload = {
  exp: number;
  iat: number;
  login: string;
  sub: "admin";
  v: 1;
};

export type AdminCredentials = {
  username: string;
  password: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
let signingKeyPromise: Promise<CryptoKey> | null = null;

function getAdminDashboardUrl() {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function getAdminCredentials(): AdminCredentials | null {
  const username = process.env.ADMIN_USERNAME?.trim() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (username && password) {
    return { username, password };
  }

  // Dev-only convenience: read DEV_ADMIN_* vars when running outside production.
  // This branch is unreachable in production because Next.js always sets
  // NODE_ENV="production" during `next build` / `next start`.
  // Set DEV_ADMIN_USERNAME + DEV_ADMIN_PASSWORD in .env.local to enable.
  if (process.env.NODE_ENV !== "production") {
    const devUsername = process.env.DEV_ADMIN_USERNAME?.trim() ?? "";
    const devPassword = process.env.DEV_ADMIN_PASSWORD ?? "";

    if (devUsername && devPassword) {
      return { username: devUsername, password: devPassword };
    }
  }

  return null;
}

function getAdminSigningKey(): string | null {
  const key = process.env.ADMIN_SIGNING_KEY?.trim() ?? "";

  if (key.length > 0) {
    return key;
  }

  // Dev-only fallback — never active when NODE_ENV="production".
  if (process.env.NODE_ENV !== "production") {
    const devKey = process.env.DEV_ADMIN_SIGNING_KEY?.trim() ?? "";
    if (devKey.length > 0) return devKey;
  }

  return null;
}

function getSigningKey() {
  if (!signingKeyPromise) {
    const signingKey = getAdminSigningKey();

    if (!signingKey) {
      throw new Error("ADMIN_SIGNING_KEY is not configured.");
    }

    signingKeyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(signingKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
  }

  return signingKeyPromise;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(paddingLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function signAdminPayload(payload: string) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return bytesToBase64Url(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

function isAdminDashboardPath(pathname: string) {
  return pathname === ADMIN_HOME_PATH || pathname.startsWith(`${ADMIN_HOME_PATH}/`);
}

export function isAdminLoginPath(pathname: string) {
  return pathname === ADMIN_LOGIN_PATH || pathname === LEGACY_ADMIN_LOGIN_PATH;
}

export function isAdminRoutePath(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === ADMIN_HOME_PATH ||
    pathname.startsWith(`${ADMIN_HOME_PATH}/`)
  );
}

export function sanitizeAdminNextPath(value: string | null | undefined) {
  if (typeof value !== "string") {
    return ADMIN_HOME_PATH;
  }

  const trimmed = value.trim();

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return ADMIN_HOME_PATH;
  }

  try {
    const url = new URL(trimmed, "https://fazumi.local");

    if (!isAdminDashboardPath(url.pathname)) {
      return ADMIN_HOME_PATH;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return ADMIN_HOME_PATH;
  }
}

export function getAdminCookieOptions(maxAge = ADMIN_SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

export function isValidAdminRequestOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  const allowedOrigins = new Set<string>([request.nextUrl.origin]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      allowedOrigins.add(new URL(appUrl).origin);
    } catch {
      // Ignore malformed app URLs here and fall back to the request origin.
    }
  }

  return allowedOrigins.has(origin);
}

export function isAdminDashboardEnabled() {
  return Boolean(
    getAdminDashboardUrl() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      getAdminCredentials() &&
      getAdminSigningKey()
  );
}

export async function createAdminSessionToken() {
  const credentials = getAdminCredentials();

  if (!credentials) {
    throw new Error("Admin credentials are not configured.");
  }

  const now = Date.now();
  const payload: AdminSessionPayload = {
    exp: now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
    iat: now,
    login: credentials.username,
    sub: "admin",
    v: 1,
  };
  const payloadSegment = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await signAdminPayload(payloadSegment);

  return `${payloadSegment}.${signature}`;
}

export async function verifyAdminSessionToken(token: string | null | undefined) {
  const credentials = getAdminCredentials();

  if (!credentials || !token) {
    return false;
  }

  const [payloadSegment, signature, ...extra] = token.split(".");

  if (!payloadSegment || !signature || extra.length > 0) {
    return false;
  }

  const expectedSignature = await signAdminPayload(payloadSegment);

  if (!constantTimeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      decoder.decode(base64UrlToBytes(payloadSegment))
    ) as Partial<AdminSessionPayload>;

    return (
      payload.v === 1 &&
      payload.sub === "admin" &&
      payload.login === credentials.username &&
      typeof payload.exp === "number" &&
      Date.now() < payload.exp
    );
  } catch {
    return false;
  }
}

export async function hasAdminSession(cookieStore: CookieStoreReader) {
  return verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export async function requireAdminPageSession(pathname: string) {
  if (!isAdminDashboardEnabled()) {
    notFound();
  }

  const cookieStore = await cookies();

  if (!(await hasAdminSession(cookieStore))) {
    redirect(
      `${ADMIN_LOGIN_PATH}?next=${encodeURIComponent(sanitizeAdminNextPath(pathname))}`
    );
  }
}

export async function redirectAuthenticatedAdmin() {
  if (!isAdminDashboardEnabled()) {
    notFound();
  }

  const cookieStore = await cookies();

  if (await hasAdminSession(cookieStore)) {
    redirect(ADMIN_HOME_PATH);
  }
}

export async function guardAdminApiRequest(request: NextRequest) {
  if (!isAdminDashboardEnabled()) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  if (!(await hasAdminSession(request.cookies))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  return null;
}
