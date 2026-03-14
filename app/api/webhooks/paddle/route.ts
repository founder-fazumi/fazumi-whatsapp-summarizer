import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyPaddleWebhookSignature } from "@/lib/paddle";
import { getPlanTypeFromPriceId } from "@/lib/paddle-config";
import { resolveEntitlement, type EntitlementSubscription } from "@/lib/limits";
import { captureRouteException } from "@/lib/sentry";
import { createRouteLogger, getRequestId } from "@/lib/logger";

// Must read raw body BEFORE any JSON parsing — required for HMAC verification
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ── Types ────────────────────────────────────────────────────────────────────

interface PaddleCustomData {
  user_id?: string;
}

interface PaddlePrice {
  id: string;
}

interface PaddleSubscriptionItem {
  price: PaddlePrice;
}

interface PaddleBillingPeriod {
  ends_at?: string;
}

interface PaddleManagementUrls {
  update_payment_method?: string;
}

interface PaddleSubscriptionData {
  id: string;
  customer_id?: string;
  status: string;
  items?: PaddleSubscriptionItem[];
  current_billing_period?: PaddleBillingPeriod;
  management_urls?: PaddleManagementUrls;
  custom_data?: PaddleCustomData;
}

interface PaddleTransactionData {
  id: string;
  customer_id?: string;
  status: string;
  items?: PaddleSubscriptionItem[];
  custom_data?: PaddleCustomData;
}

interface PaddleWebhookPayload {
  event_type: string;
  occurred_at?: string;
  data: PaddleSubscriptionData | PaddleTransactionData;
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const route = "/api/webhooks/paddle";
  const requestId = getRequestId(req.headers);
  const logger = createRouteLogger({ route, requestId });
  const requestStartedAt = Date.now();
  logger.info("webhook.start");

  const rawBody = await req.text();
  // Paddle uses lowercase header name
  const signatureHeader = req.headers.get("paddle-signature") ?? "";
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!secret) {
    const error = new Error("Missing PADDLE_WEBHOOK_SECRET env var.");
    logger.error("webhook.config_error", {
      errorCode: "WEBHOOK_SECRET_MISSING",
      statusCode: 500,
      error: error.message,
    });
    await captureRouteException(error, {
      route,
      requestId,
      errorCode: "WEBHOOK_SECRET_MISSING",
      statusCode: 500,
    });
    return NextResponse.json({ error: "Missing webhook secret." }, { status: 500 });
  }

  if (!verifyPaddleWebhookSignature(rawBody, signatureHeader, secret)) {
    const error = new Error("Invalid Paddle webhook signature.");
    logger.warn("webhook.invalid_signature", {
      errorCode: "INVALID_SIGNATURE",
      statusCode: 400,
    });
    await captureRouteException(error, {
      route,
      requestId,
      errorCode: "INVALID_SIGNATURE",
      statusCode: 400,
    });
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let payload: PaddleWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PaddleWebhookPayload;
  } catch {
    logger.warn("webhook.invalid_json", { errorCode: "INVALID_JSON" });
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const event = payload.event_type;
  const paddleId = payload.data.id;
  const occurredAt = payload.occurred_at ? new Date(payload.occurred_at) : null;
  const userId = payload.data.custom_data?.user_id;

  logger.info("webhook.parsed", { userId, eventType: event, paddleId });

  if (!userId) {
    logger.warn("webhook.ignored_missing_user", {
      eventType: event,
      paddleId,
      errorCode: "MISSING_USER_ID",
    });
    return NextResponse.json({ ok: true });
  }

  const adminUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminUrl || !adminKey) {
    const error = new Error("Supabase admin credentials not configured.");
    logger.error("webhook.config_error", {
      userId,
      eventType: event,
      paddleId,
      errorCode: "SUPABASE_ADMIN_MISSING",
      statusCode: 500,
      error: error.message,
    });
    await captureRouteException(error, {
      route,
      requestId,
      userId,
      errorCode: "SUPABASE_ADMIN_MISSING",
      statusCode: 500,
      eventType: event,
      paddleId,
    });
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const admin = createAdminClient(adminUrl, adminKey);

  try {
    await routeEvent(admin, event, userId, payload, occurredAt, logger);
    await recordWebhookDelivery(admin, {
      provider: "paddle",
      eventName: event,
      externalId: paddleId,
      requestId,
      status: "processed",
      httpStatus: 200,
      userId,
    });
    logger.info("webhook.success", {
      userId,
      eventType: event,
      paddleId,
      durationMs: Date.now() - requestStartedAt,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    await recordWebhookDelivery(admin, {
      provider: "paddle",
      eventName: event,
      externalId: paddleId,
      requestId,
      status: "failed",
      httpStatus: 500,
      userId,
      errorCode: "WEBHOOK_HANDLER_FAILED",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    logger.error("webhook.failed", {
      userId,
      eventType: event,
      paddleId,
      errorCode: "WEBHOOK_HANDLER_FAILED",
      statusCode: 500,
      durationMs: Date.now() - requestStartedAt,
      error: err instanceof Error ? err.message : String(err),
    });
    await captureRouteException(err, {
      route,
      requestId,
      userId,
      errorCode: "WEBHOOK_HANDLER_FAILED",
      statusCode: 500,
      eventType: event,
      paddleId,
    });
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

// ── Event routing ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any>;

async function routeEvent(
  admin: AdminClient,
  event: string,
  userId: string,
  payload: PaddleWebhookPayload,
  occurredAt: Date | null,
  logger: ReturnType<typeof createRouteLogger>
) {
  const data = payload.data as PaddleSubscriptionData & PaddleTransactionData;
  const paddleId = data.id;
  const logCtx = { userId, eventType: event, paddleId };

  switch (event) {
    // ── subscription.activated ─────────────────────────────────────────────
    // Fires when a subscription transitions to `active` status. This includes
    // both initial activation and past_due → active recovery.
    //
    // Why not a separate handler: Paddle ALSO fires subscription.updated for
    // every status transition, which covers the same state changes. Handling
    // both cases in the same block with ordering protection means the second
    // delivery (whichever arrives later) is safely dropped as stale.
    case "subscription.activated":

    // ── subscription.updated ──────────────────────────────────────────────
    // Fires for ALL subscription state changes: active ↔ past_due, plan
    // changes, payment method updates, cancellation reverts, etc.
    // This is the primary handler for ongoing subscription lifecycle.
    case "subscription.updated": {
      const sub = data as PaddleSubscriptionData;
      const priceId = sub.items?.[0]?.price?.id ?? "";
      const planType = getPlanTypeFromPriceId(priceId) ?? null;
      const currentPeriodEnd = sub.current_billing_period?.ends_at ?? null;
      // Temporary signed URL — expires within hours; stored best-effort for
      // billing UI convenience. Do not rely on for production billing flows.
      const managementUrl = sub.management_urls?.update_payment_method ?? null;

      // Ordering protection: skip if we have already applied a more recent
      // Paddle event for this subscription.
      if (await isStaleEvent(admin, paddleId, occurredAt, logger, logCtx)) break;

      const { error } = await admin
        .from("subscriptions")
        .update({
          status: sub.status,
          current_period_end: currentPeriodEnd,
          paddle_customer_id: sub.customer_id ?? null,
          updated_at: new Date().toISOString(),
          ...(occurredAt ? { paddle_occurred_at: occurredAt.toISOString() } : {}),
          ...(planType ? { plan_type: planType } : {}),
          ...(managementUrl ? { paddle_management_url: managementUrl } : {}),
        })
        .eq("paddle_subscription_id", paddleId);

      if (error) throw new Error(`Could not update subscription: ${error.message}`);

      await reconcileProfilePlan(admin, userId);
      logger.info("webhook.status_changed", {
        ...logCtx,
        planType: planType ?? undefined,
        status: sub.status,
      });
      break;
    }

    case "subscription.created": {
      const sub = data as PaddleSubscriptionData;
      const priceId = sub.items?.[0]?.price?.id ?? "";
      const planType = getPlanTypeFromPriceId(priceId) ?? "monthly";
      const currentPeriodEnd = sub.current_billing_period?.ends_at ?? null;
      const managementUrl = sub.management_urls?.update_payment_method ?? null;

      // Ordering protection: a delayed subscription.created must not overwrite
      // a subscription.updated or subscription.past_due that arrived first.
      // isStaleEvent returns false when no row exists yet (genuine first delivery).
      if (await isStaleEvent(admin, paddleId, occurredAt, logger, logCtx)) break;

      await upsertSubscription(admin, {
        userId,
        paddleSubscriptionId: paddleId,
        paddleCustomerId: sub.customer_id ?? null,
        planType,
        status: sub.status,
        currentPeriodEnd,
        managementUrl,
        occurredAt,
      });

      await reconcileProfilePlan(admin, userId);
      logger.info("webhook.status_changed", {
        ...logCtx,
        planType,
        status: sub.status,
      });
      break;
    }

    case "subscription.canceled": {
      const sub = data as PaddleSubscriptionData;

      if (await isStaleEvent(admin, paddleId, occurredAt, logger, logCtx)) break;

      const { error } = await admin
        .from("subscriptions")
        .update({
          status: "canceled",
          current_period_end: sub.current_billing_period?.ends_at ?? null,
          updated_at: new Date().toISOString(),
          ...(occurredAt ? { paddle_occurred_at: occurredAt.toISOString() } : {}),
        })
        .eq("paddle_subscription_id", paddleId);

      if (error) throw new Error(`Could not cancel subscription: ${error.message}`);
      await reconcileProfilePlan(admin, userId);
      logger.info("webhook.status_changed", { ...logCtx, status: "canceled" });
      break;
    }

    case "subscription.past_due": {
      if (await isStaleEvent(admin, paddleId, occurredAt, logger, logCtx)) break;

      const { error } = await admin
        .from("subscriptions")
        .update({
          status: "past_due",
          updated_at: new Date().toISOString(),
          ...(occurredAt ? { paddle_occurred_at: occurredAt.toISOString() } : {}),
        })
        .eq("paddle_subscription_id", paddleId);

      if (error) throw new Error(`Could not mark past_due: ${error.message}`);
      await reconcileProfilePlan(admin, userId);
      logger.info("webhook.status_changed", { ...logCtx, status: "past_due" });
      break;
    }

    // ── transaction.completed ─────────────────────────────────────────────
    // One-time founder purchase. Recurring payments flow through
    // subscription.updated, not here.
    case "transaction.completed": {
      const txn = data as PaddleTransactionData;
      const priceId = txn.items?.[0]?.price?.id ?? "";
      const planType = getPlanTypeFromPriceId(priceId);

      if (planType !== "founder") {
        // Recurring transaction invoices are covered by subscription.* events.
        logger.info("webhook.ignored_non_founder_transaction", {
          ...logCtx,
          priceId,
        });
        break;
      }

      await upsertSubscription(admin, {
        userId,
        paddleTransactionId: paddleId,
        paddleCustomerId: txn.customer_id ?? null,
        planType: "founder",
        status: "active",
        currentPeriodEnd: null,
        occurredAt,
      });

      await reconcileProfilePlan(admin, userId);
      logger.info("webhook.status_changed", {
        ...logCtx,
        planType: "founder",
        status: "active",
      });
      break;
    }

    default:
      logger.info("webhook.unhandled_event", logCtx);
  }
}

// ── Ordering protection ───────────────────────────────────────────────────────

/**
 * Returns true (and logs) when the incoming event is older than the most
 * recent Paddle event we have already applied to this subscription row.
 * Paddle does not guarantee delivery order; this prevents a late-arriving
 * event from overwriting a newer state.
 */
async function isStaleEvent(
  admin: AdminClient,
  paddleSubscriptionId: string,
  occurredAt: Date | null,
  logger: ReturnType<typeof createRouteLogger>,
  logCtx: { userId: string; eventType: string; paddleId: string }
): Promise<boolean> {
  if (occurredAt === null) return false;

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, paddle_occurred_at")
    .eq("paddle_subscription_id", paddleSubscriptionId)
    .maybeSingle();

  if (!existing?.paddle_occurred_at) return false;

  const existingTime = new Date(existing.paddle_occurred_at as string).getTime();
  if (occurredAt.getTime() <= existingTime) {
    logger.info("webhook.skipped_stale_event", {
      ...logCtx,
      occurredAt: occurredAt.toISOString(),
      existingOccurredAt: existing.paddle_occurred_at as string,
    });
    return true;
  }
  return false;
}

// ── DB helpers ────────────────────────────────────────────────────────────────

interface PaddleSubscriptionRow {
  userId: string;
  paddleSubscriptionId?: string | null;
  paddleTransactionId?: string | null;
  paddleCustomerId?: string | null;
  planType: string;
  status: string;
  currentPeriodEnd?: string | null;
  managementUrl?: string | null;
  occurredAt?: Date | null;
}

async function upsertSubscription(admin: AdminClient, row: PaddleSubscriptionRow) {
  const record = {
    user_id: row.userId,
    ls_subscription_id: null,
    ls_order_id: null,
    paddle_subscription_id: row.paddleSubscriptionId ?? null,
    paddle_transaction_id: row.paddleTransactionId ?? null,
    paddle_customer_id: row.paddleCustomerId ?? null,
    plan_type: row.planType,
    status: row.status,
    current_period_end: row.currentPeriodEnd ?? null,
    // Temporary signed URL — best-effort; expires within hours.
    ...(row.managementUrl ? { paddle_management_url: row.managementUrl } : {}),
    ...(row.occurredAt ? { paddle_occurred_at: row.occurredAt.toISOString() } : {}),
    updated_at: new Date().toISOString(),
  };

  if (row.paddleSubscriptionId) {
    const { error } = await admin
      .from("subscriptions")
      .upsert(record, { onConflict: "paddle_subscription_id" });
    if (error) throw new Error(`Could not upsert subscription: ${error.message}`);
  } else if (row.paddleTransactionId) {
    const { error } = await admin
      .from("subscriptions")
      .upsert(record, { onConflict: "paddle_transaction_id" });
    if (error) throw new Error(`Could not upsert founder transaction: ${error.message}`);
  } else {
    throw new Error("upsertSubscription requires paddleSubscriptionId or paddleTransactionId");
  }
}

async function setPlan(admin: AdminClient, userId: string, planType: string) {
  const { error } = await admin
    .from("profiles")
    .update({ plan: planType, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(`Could not update profile plan: ${error.message}`);
}

async function reconcileProfilePlan(admin: AdminClient, userId: string) {
  const [{ data: profile }, { data: subscriptions, error: subscriptionsError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("plan, trial_expires_at")
        .eq("id", userId)
        .maybeSingle<{ plan: string | null; trial_expires_at: string | null }>(),
      admin
        .from("subscriptions")
        .select(
          "plan_type, status, current_period_end, updated_at, created_at, " +
            "ls_customer_portal_url, ls_update_payment_method_url, ls_subscription_id, ls_order_id, " +
            "paddle_subscription_id, paddle_transaction_id, paddle_management_url"
        )
        .eq("user_id", userId),
    ]);

  if (subscriptionsError) {
    throw new Error(`Could not read subscriptions: ${subscriptionsError.message}`);
  }

  const entitlement = resolveEntitlement({
    profile: {
      plan: profile?.plan ?? "free",
      trial_expires_at: profile?.trial_expires_at ?? null,
    },
    subscriptions: (subscriptions ?? []) as EntitlementSubscription[],
  });

  const nextPlan = entitlement.hasPaidAccess ? entitlement.effectivePlan : "free";
  await setPlan(admin, userId, nextPlan);
}

async function recordWebhookDelivery(
  admin: AdminClient,
  payload: {
    provider: string;
    eventName: string;
    externalId: string;
    requestId: string;
    status: "processed" | "failed" | "rejected";
    httpStatus: number;
    userId?: string | null;
    errorCode?: string;
    errorMessage?: string;
  }
) {
  try {
    await admin.from("webhook_delivery_log").insert({
      provider: payload.provider,
      event_name: payload.eventName,
      external_id: payload.externalId,
      request_id: payload.requestId,
      status: payload.status,
      http_status: payload.httpStatus,
      user_id: payload.userId ?? null,
      error_code: payload.errorCode ?? null,
      error_message: payload.errorMessage ?? null,
    });
  } catch {
    // Do not block billing flows on observability writes.
  }
}
