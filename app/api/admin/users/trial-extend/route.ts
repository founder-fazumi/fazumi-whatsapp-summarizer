import { NextRequest, NextResponse } from "next/server";
import {
  getAdminCredentials,
  getRequestIp,
  guardAdminApiRequest,
} from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";

const DAY_MS = 86_400_000;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TrialExtendBody = {
  days?: unknown;
  userId?: unknown;
};

export async function POST(request: NextRequest) {
  const guardResponse = await guardAdminApiRequest(request);

  if (guardResponse) {
    return guardResponse;
  }

  const adminUsername = getAdminCredentials()?.username ?? "admin";
  if (!checkAdminRateLimit(`${adminUsername}:users:trial-extend`)) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  let body: TrialExtendBody;

  try {
    body = (await request.json()) as TrialExtendBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const days = typeof body.days === "number" ? body.days : 7;

  if (!userId || !Number.isInteger(days) || days < 1 || days > 30) {
    return NextResponse.json({ ok: false, error: "Invalid userId or days." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const newExpiresAt = new Date(Date.now() + days * DAY_MS).toISOString();
    const { error } = await admin
      .from("profiles")
      .update({ trial_expires_at: newExpiresAt })
      .eq("id", userId);

    if (error) {
      throw error;
    }

    await logAdminAction({
      adminUsername,
      action: "trial_extend",
      targetType: "user",
      targetIds: [userId],
      details: { days, newExpiresAt },
      ip: getRequestIp(request),
    });

    return NextResponse.json({ ok: true, newExpiresAt });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not extend trial.",
      },
      { status: 500 }
    );
  }
}
