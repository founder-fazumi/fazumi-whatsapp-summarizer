import { NextRequest, NextResponse } from "next/server";
import { sendMorningDigest } from "@/lib/push/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV === "development";
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const requestedAt = request.nextUrl.searchParams.get("at");
    const now = requestedAt ? new Date(requestedAt) : new Date();

    if (Number.isNaN(now.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Invalid at parameter." },
        { status: 400 }
      );
    }

    const result = await sendMorningDigest(now);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not send morning digest.",
      },
      { status: 500 }
    );
  }
}
