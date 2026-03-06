import { NextRequest, NextResponse } from "next/server";
import { guardAdminApiRequest } from "@/lib/admin/auth";
import { getRecentSubscriptionEvents } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guardResponse = await guardAdminApiRequest(request);

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const data = await getRecentSubscriptionEvents(10);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not load recent subscriptions.",
      },
      { status: 500 }
    );
  }
}
