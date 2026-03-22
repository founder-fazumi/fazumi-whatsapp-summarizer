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
  /** Pass true to override the safety check for active subscriptions. */
  override?: unknown;
};

function isValidPlan(plan: string): plan is ValidPlan {
  return VALID_PLANS.includes(plan as ValidPlan);
}

async function getActiveSubscription(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin
    .from("subscriptions")
    .select("id, plan_type, status, current_period_end, ls_subscription_id")
    .eq("user_id", userId)
    .in("status", ["active", "past_due"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as {
    id: string;
    plan_type: string | null;
    status: string;
    current_period_end: string | null;
    ls_subscription_id: string | null;
  } | null;
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
  const override = body.override === true;

  if (!userId || !isValidPlan(requestedPlan)) {
    return NextResponse.json({ ok: false, error: "Invalid userId or plan." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // Safety check: if the user has an active paid Lemon Squeezy subscription,
    // warn the admin unless they explicitly pass override=true.
    // The risk: plan-change only updates profiles.plan; the next LS webhook
    // will overwrite it back. For paid→lower changes this is misleading.
    const activeSub = await getActiveSubscription(admin, userId);
    let warning: string | undefined;

    if (activeSub && !override) {
      const isDowngrade =
        requestedPlan === "free" ||
        requestedPlan === "trial" ||
        (requestedPlan === "monthly" && activeSub.plan_type === "annual") ||
        (requestedPlan === "monthly" && activeSub.plan_type === "founder") ||
        (requestedPlan === "annual" && activeSub.plan_type === "founder");

      if (isDowngrade) {
        return NextResponse.json(
          {
            ok: false,
            error: `User has an active ${activeSub.plan_type ?? "paid"} subscription (${activeSub.status}). Changing their plan profile will be overwritten by the next Lemon Squeezy webhook. Cancel the subscription in LS first, or pass override=true to force this change anyway.`,
            activeSubscription: {
              planType: activeSub.plan_type,
              status: activeSub.status,
              lsSubscriptionId: activeSub.ls_subscription_id,
              currentPeriodEnd: activeSub.current_period_end,
            },
          },
          { status: 409 }
        );
      }

      // Same plan or upgrade — allow but warn
      if (activeSub.plan_type !== requestedPlan) {
        warning = `User has an active ${activeSub.plan_type ?? "paid"} Lemon Squeezy subscription. The next webhook event may overwrite this change. Manage the subscription in Lemon Squeezy to make it permanent.`;
      }
    }

    const now = Date.now();
    const profilePatch =
      requestedPlan === "trial"
        ? {
            plan: "free",
            trial_expires_at: new Date(now + 7 * DAY_MS).toISOString(),
          }
        : {
            plan: requestedPlan,
            trial_expires_at: null as string | null,
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
        override,
        hadActiveSub: activeSub
          ? { planType: activeSub.plan_type, status: activeSub.status }
          : null,
      },
      ip: getRequestIp(request),
    });

    return NextResponse.json({
      ok: true,
      appliedPlan: requestedPlan,
      trialExpiresAt: profilePatch.trial_expires_at,
      warning,
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
