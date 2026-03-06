import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertPushSubscription } from "@/lib/push/server";
import type { WebPushSubscriptionPayload } from "@/lib/push/types";
import { normalizeTimeZone } from "@/lib/push/timezone";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        subscription?: WebPushSubscriptionPayload;
        timezone?: string | null;
      }
    | null;

  if (
    !body?.subscription?.endpoint ||
    !body.subscription.keys?.auth ||
    !body.subscription.keys?.p256dh
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid push subscription payload." },
      { status: 400 }
    );
  }

  try {
    await upsertPushSubscription({
      userId: user.id,
      subscription: body.subscription,
      timezone: normalizeTimeZone(body.timezone),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not save push subscription.",
      },
      { status: 500 }
    );
  }
}
