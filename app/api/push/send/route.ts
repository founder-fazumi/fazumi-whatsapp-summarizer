import { NextRequest, NextResponse } from "next/server";
import {
  sendPushNotification,
  sendPushToUser,
} from "@/lib/push/server";
import type {
  PushNotificationPayload,
  WebPushSubscriptionPayload,
} from "@/lib/push/types";

export const runtime = "nodejs";

function isAuthorizedInternalRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV === "development";
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        userId?: string;
        subscription?: WebPushSubscriptionPayload;
        payload?: PushNotificationPayload;
      }
    | null;

  if (!body?.payload) {
    return NextResponse.json({ ok: false, error: "Missing push payload." }, { status: 400 });
  }

  try {
    if (body.userId) {
      const result = await sendPushToUser(body.userId, body.payload);
      return NextResponse.json({ ok: true, result });
    }

    if (body.subscription) {
      await sendPushNotification(body.subscription, body.payload);
      return NextResponse.json({ ok: true, result: { sent: 1 } });
    }

    return NextResponse.json(
      { ok: false, error: "Missing userId or subscription." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not send push notification.",
      },
      { status: 500 }
    );
  }
}
