import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyWebhookSignature, getPlanType } from "@/lib/lemonsqueezy";
import { resolveEntitlement, type EntitlementSubscription } from "@/lib/limits";
import { captureRouteException } from "@/lib/sentry";
import { createRouteLogger, getRequestId } from "@/lib/logger";

// Must read raw body BEFORE any JSON parsing — required for HMAC verification
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ── Types ───────────────────────────────────────────────────────────────────

interface LsWebhookMeta {
  event_name: string;
  custom_data?: { user_id?: string };
}

interface LsSubscriptionAttributes {
  variant_id: number;
  status: string;
  renews_at?: string;
  ends_at?: string;
  urls?: {
    customer_portal?: string;
    update_payment_method?: string;
  };
}

interface LsOrderAttributes {
  variant_id: number;
  first_order_item?: { variant_id: number };
}

interface LsWebhookPayload {
  meta: LsWebhookMeta;
  data: {
    id: string;
    attributes: LsSubscriptionAttributes & LsOrderAttributes;
    relationships?: { order?: { data?: { id: string } } };
  };
}

// ── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const route = "/api/webhooks/lemonsqueezy";
  const requestId = getRequestId(req.headers);
  const logger = createRouteLogger({ route, requestId });
  const requestStartedAt = Date.now();
  logger.info("webhook.start");

  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? process.env.LEMON_SIGNING_SECRET;

  if (!secret) {
    const error = new Error(
      "Missing webhook secret env var (LEMONSQUEEZY_WEBHOOK_SECRET or legacy LEMON_SIGNING_SECRET)."
    );
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
    return NextResponse.json(
      {
        error:
          "Missing webhook secret env var. Set LEMONSQUEEZY_WEBHOOK_SECRET or legacy LEMON_SIGNING_SECRET.",
      },
      { status: 500 }
    );
  }

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    const error = new Error("Invalid Lemon Squeezy webhook signature.");
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

  let payload: LsWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LsWebhookPayload;
  } catch {
    logger.warn("webhook.invalid_json", { errorCode: "INVALID_JSON" });
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const event = payload.meta.event_name;
  const userId = payload.meta.custom_data?.user_id;
  const lsId = payload.data.id;
  logger.info("webhook.parsed", {
    userId,
    eventType: event,
    lsId,
  });

  // Unknown order — no user_id attached, ignore safely
  if (!userId) {
    logger.warn("webhook.ignored_missing_user", {
      eventType: event,
      lsId,
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
      lsId,
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
      lsId,
    });
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const admin = createAdminClient(adminUrl, adminKey);

  try {
    await routeEvent(admin, event, userId, payload, logger);
    await recordWebhookDelivery(admin, {
      provider: "lemonsqueezy",
      eventName: event,
      externalId: lsId,
      requestId,
      status: "processed",
      httpStatus: 200,
      userId,
    });
    logger.info("webhook.success", {
      userId,
      eventType: event,
      lsId,
      durationMs: Date.now() - requestStartedAt,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    await recordWebhookDelivery(admin, {
      provider: "lemonsqueezy",
      eventName: event,
      externalId: lsId,
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
      lsId,
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
      lsId,
    });
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

// ── Event routing ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any>;

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

async function reconcileProfilePlan(admin: AdminClient, userId: string) {
  const [{ data: profile }, { data: subscriptions, error: subscriptionsError }] = await Promise.all([
    admin
      .from("profiles")
      .select("plan, trial_expires_at")
      .eq("id", userId)
      .maybeSingle<{ plan: string | null; trial_expires_at: string | null }>(),
    admin
      .from("subscriptions")
      .select(
        "plan_type, status, current_period_end, updated_at, created_at, ls_customer_portal_url, ls_update_payment_method_url, ls_subscription_id, ls_order_id"
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
  const { error } = await admin
    .from("profiles")
    .update({ plan: nextPlan, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    throw new Error(`Could not update profile plan: ${error.message}`);
  }
}

async function routeEvent(
  admin: AdminClient,
  event: string,
  userId: string,
  payload: LsWebhookPayload,
  logger: ReturnType<typeof createRouteLogger>
) {
  const { data: entity } = payload;
  const attrs = entity.attributes;
  const lsId = entity.id;
  const portalUrls = getSubscriptionPortalUrls(attrs.urls);

  switch (event) {
    case "order_created": {
      const variantId = String(attrs.first_order_item?.variant_id ?? attrs.variant_id);
      const planType = getPlanType(variantId);
      if (!planType) {
        logger.warn("webhook.ignored_unknown_plan", {
          userId,
          eventType: event,
          lsId,
          variantId,
          errorCode: "UNKNOWN_VARIANT",
        });
        break;
      }

      await upsertSubscription(admin, {
        userId,
        lsSubscriptionId: null,
        lsOrderId: lsId,
        planType,
        status: "active",
        currentPeriodEnd: null,
      });
      await reconcileProfilePlan(admin, userId);
      logger.info("webhook.status_changed", {
        userId,
        eventType: event,
        lsId,
        lsOrderId: lsId,
        planType,
        status: "active",
      });
      break;
    }

    case "subscription_created": {
      const variantId = String(attrs.variant_id);
      const planType = getPlanType(variantId) ?? "monthly";

      await upsertSubscription(admin, {
        userId,
        lsSubscriptionId: lsId,
        lsOrderId: null,
        planType,
        status: "active",
        currentPeriodEnd: attrs.renews_at ?? null,
        ...portalUrls,
      });
      await reconcileProfilePlan(admin, userId);
      logger.info("webhook.status_changed", {
        userId,
        eventType: event,
        lsId,
        planType,
        status: "active",
      });
      break;
    }

    case "subscription_updated": {
      const planType = getPlanType(String(attrs.variant_id));
      const { error } = await admin
        .from("subscriptions")
        .update({
          status: attrs.status,
          current_period_end: attrs.renews_at ?? attrs.ends_at ?? null,
          ...(planType ? { plan_type: planType } : {}),
          ...toSubscriptionUrlColumns(portalUrls),
          updated_at: new Date().toISOString(),
        })
        .eq("ls_subscription_id", lsId);
      if (error) {
        throw new Error(`Could not update subscription: ${error.message}`);
      }
      await reconcileProfilePlan(admin, userId);
      logger.info("webhook.status_changed", {
        userId,
        eventType: event,
        lsId,
        planType: planType ?? undefined,
        status: attrs.status,
      });
      break;
    }

    case "subscription_cancelled": {
      const planType = getPlanType(String(attrs.variant_id));
      const { error } = await admin
        .from("subscriptions")
        .update({
          status: "cancelled",
          current_period_end: attrs.ends_at ?? attrs.renews_at ?? null,
          ...(planType ? { plan_type: planType } : {}),
          ...toSubscriptionUrlColumns(portalUrls),
          updated_at: new Date().toISOString(),
        })
        .eq("ls_subscription_id", lsId);
      if (error) {
        throw new Error(`Could not cancel subscription: ${error.message}`);
      }
      await reconcileProfilePlan(admin, userId);
      logger.info("webhook.status_changed", {
        userId,
        eventType: event,
        lsId,
        planType: planType ?? undefined,
        status: "cancelled",
      });
      break;
    }

    case "subscription_payment_success": {
      const planType = getPlanType(String(attrs.variant_id));
      const { error } = await admin
        .from("subscriptions")
        .update({
          status: "active",
          current_period_end: attrs.renews_at ?? null,
          ...(planType ? { plan_type: planType } : {}),
          ...toSubscriptionUrlColumns(portalUrls),
          updated_at: new Date().toISOString(),
        })
        .eq("ls_subscription_id", lsId);
      if (error) {
        throw new Error(`Could not refresh subscription period: ${error.message}`);
      }
      await reconcileProfilePlan(admin, userId);
      logger.info("webhook.status_changed", {
        userId,
        eventType: event,
        lsId,
        planType: planType ?? undefined,
        status: "active",
      });
      break;
    }

    case "subscription_expired": {
      const planType = getPlanType(String(attrs.variant_id));
      const { error } = await admin
        .from("subscriptions")
        .update({
          status: "expired",
          current_period_end: attrs.ends_at ?? attrs.renews_at ?? null,
          ...(planType ? { plan_type: planType } : {}),
          ...toSubscriptionUrlColumns(portalUrls),
          updated_at: new Date().toISOString(),
        })
        .eq("ls_subscription_id", lsId);
      if (error) {
        throw new Error(`Could not expire subscription: ${error.message}`);
      }
      await reconcileProfilePlan(admin, userId);
      logger.info("webhook.status_changed", {
        userId,
        eventType: event,
        lsId,
        planType: planType ?? undefined,
        status: "expired",
      });
      break;
    }

    default:
      logger.info("webhook.unhandled_event", {
        userId,
        eventType: event,
        lsId,
      });
  }
}
// ── DB helpers ───────────────────────────────────────────────────────────────

interface SubscriptionRow {
  userId: string;
  lsSubscriptionId: string | null;
  lsOrderId: string | null;
  planType: string;
  status: string;
  currentPeriodEnd: string | null;
  customerPortalUrl?: string;
  updatePaymentMethodUrl?: string;
}

async function upsertSubscription(admin: AdminClient, row: SubscriptionRow) {
  const record = {
    user_id: row.userId,
    ls_subscription_id: row.lsSubscriptionId,
    ls_order_id: row.lsOrderId,
    plan_type: row.planType,
    status: row.status,
    current_period_end: row.currentPeriodEnd,
    ...toSubscriptionUrlColumns(row),
    updated_at: new Date().toISOString(),
  };

  // Upsert on ls_subscription_id when present; otherwise upsert on ls_order_id for one-time orders.
  if (row.lsSubscriptionId) {
    const { error } = await admin
      .from("subscriptions")
      .upsert(record, { onConflict: "ls_subscription_id" });
    if (error) {
      throw new Error(`Could not upsert subscription: ${error.message}`);
    }
  } else {
    const { error } = await admin
      .from("subscriptions")
      .upsert(record, { onConflict: "ls_order_id" });
    if (error) {
      throw new Error(`Could not upsert founder order: ${error.message}`);
    }
  }
}

function getSubscriptionPortalUrls(urls?: LsSubscriptionAttributes["urls"]) {
  return {
    customerPortalUrl:
      typeof urls?.customer_portal === "string" && urls.customer_portal.length > 0
        ? urls.customer_portal
        : undefined,
    updatePaymentMethodUrl:
      typeof urls?.update_payment_method === "string" && urls.update_payment_method.length > 0
        ? urls.update_payment_method
        : undefined,
  };
}

function toSubscriptionUrlColumns(urls: {
  customerPortalUrl?: string;
  updatePaymentMethodUrl?: string;
}) {
  return {
    ...(urls.customerPortalUrl ? { ls_customer_portal_url: urls.customerPortalUrl } : {}),
    ...(urls.updatePaymentMethodUrl
      ? { ls_update_payment_method_url: urls.updatePaymentMethodUrl }
      : {}),
  };
}

