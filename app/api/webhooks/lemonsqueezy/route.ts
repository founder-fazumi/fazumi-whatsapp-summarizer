import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyWebhookSignature, getPlanType } from "@/lib/lemonsqueezy";
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
    logger.info("webhook.success", {
      userId,
      eventType: event,
      lsId,
      durationMs: Date.now() - requestStartedAt,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
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
      // One-time purchase (Founder LTD) — variant_id from first_order_item
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
      await setPlan(admin, userId, planType);
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
      await setPlan(admin, userId, planType);
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
      const { error } = await admin
        .from("subscriptions")
        .update({
          status: attrs.status,
          current_period_end: attrs.renews_at ?? attrs.ends_at ?? null,
          ...toSubscriptionUrlColumns(portalUrls),
          updated_at: new Date().toISOString(),
        })
        .eq("ls_subscription_id", lsId);
      if (error) {
        throw new Error(`Could not update subscription: ${error.message}`);
      }
      logger.info("webhook.status_changed", {
        userId,
        eventType: event,
        lsId,
        status: attrs.status,
      });
      break;
    }

    case "subscription_cancelled": {
      const { error } = await admin
        .from("subscriptions")
        .update({
          status: "cancelled",
          current_period_end: attrs.ends_at ?? attrs.renews_at ?? null,
          ...toSubscriptionUrlColumns(portalUrls),
          updated_at: new Date().toISOString(),
        })
        .eq("ls_subscription_id", lsId);
      if (error) {
        throw new Error(`Could not cancel subscription: ${error.message}`);
      }
      // Access continues until period_end — do NOT change profiles.plan yet
      logger.info("webhook.status_changed", {
        userId,
        eventType: event,
        lsId,
        status: "cancelled",
      });
      break;
    }

    case "subscription_payment_success": {
      // Recurring payment succeeded — refresh period end and keep status active
      const { error } = await admin
        .from("subscriptions")
        .update({
          status: "active",
          current_period_end: attrs.renews_at ?? null,
          ...toSubscriptionUrlColumns(portalUrls),
          updated_at: new Date().toISOString(),
        })
        .eq("ls_subscription_id", lsId);
      if (error) {
        throw new Error(`Could not refresh subscription period: ${error.message}`);
      }
      // Defensive re-set: restore plan if it drifted to "free" during past_due
      const variantId = String(attrs.variant_id);
      const planType = getPlanType(variantId);
      if (planType && userId) {
        await setPlan(admin, userId, planType);
      }
      logger.info("webhook.status_changed", {
        userId,
        eventType: event,
        lsId,
        status: "active",
      });
      break;
    }

    case "subscription_expired": {
      const { error } = await admin
        .from("subscriptions")
        .update({
          status: "expired",
          ...toSubscriptionUrlColumns(portalUrls),
          updated_at: new Date().toISOString(),
        })
        .eq("ls_subscription_id", lsId);
      if (error) {
        throw new Error(`Could not expire subscription: ${error.message}`);
      }
      // Revoke paid access
      await setPlan(admin, userId, "free");
      logger.info("webhook.status_changed", {
        userId,
        eventType: event,
        lsId,
        status: "expired",
      });
      break;
    }

    default:
      // Unknown event — log and ignore
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

async function setPlan(admin: AdminClient, userId: string, plan: string) {
  const { error } = await admin
    .from("profiles")
    .update({ plan, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    throw new Error(`Could not update profile plan: ${error.message}`);
  }
}
