import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  getAdminCookieOptions,
  isValidAdminRequestOrigin,
} from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  if (!isValidAdminRequestOrigin(request)) {
    return noStore(
      NextResponse.json({ ok: false, error: "Invalid request." }, { status: 403 })
    );
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(ADMIN_COOKIE_NAME, "", getAdminCookieOptions(0));

  return noStore(response);
}
