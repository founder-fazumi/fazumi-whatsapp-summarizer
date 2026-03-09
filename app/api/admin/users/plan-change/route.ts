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
const VALID_PLANS = ["free", "trial", "monthly", "annual", "founder"] as const;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ValidPlan = (typeof VALID_PLANS)[number];

type PlanChangeBody = {
  plan?: unknown;
  userId?: unknown;
};

function isValidPlan(plan: string): plan is ValidPlan {
  return VALID_PLANS.includes(plan as ValidPlan);
}

export async function POST(request: NextRequest) {
  const guardResponse = await guardAdminApiRequest(request);

  if (guardResponse) {
    return guardResponse;
  }

  const adminUsername = getAdminCredentials()?.username ?? "admin";
  if (!checkAdminRateLimit(`${adminUsername}:users:plan-change`)) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  let body: PlanChangeBody;

  try {
    body = (await request.json()) as PlanChangeBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const requestedPlan = typeof body.plan === "string" ? body.plan.trim().toLowerCase() : "";

  if (!userId || !isValidPlan(requestedPlan)) {
    return NextResponse.json({ ok: false, error: "Invalid userId or plan." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const now = Date.now();
    const profilePatch =
      requestedPlan === "trial"
        ? {
            plan: "free",
            trial_expires_at: new Date(now + 7 * DAY_MS).toISOString(),
          }
        : {
            plan: requestedPlan,
            trial_expires_at: null,
          };
    const { error } = await admin.from("profiles").update(profilePatch).eq("id", userId);

    if (error) {
      throw error;
    }

    await logAdminAction({
      adminUsername,
      action: "plan_change",
      targetType: "user",
      targetIds: [userId],
      details: {
        newPlan: requestedPlan,
        trialExpiresAt: profilePatch.trial_expires_at,
      },
      ip: getRequestIp(request),
    });

    return NextResponse.json({
      ok: true,
      appliedPlan: requestedPlan,
      trialExpiresAt: profilePatch.trial_expires_at,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not change plan.",
      },
      { status: 500 }
    );
  }
}
