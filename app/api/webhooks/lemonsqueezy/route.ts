import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyWebhookSignature, getPlanType } from "@/lib/lemonsqueezy";

// Must read raw body BEFORE any JSON parsing — required for HMAC verification
export const dynamic = "force-dynamic";

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
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";

  if (!secret) {
    console.error("[LS webhook] LEMONSQUEEZY_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let payload: LsWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LsWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const event = payload.meta.event_name;
  const userId = payload.meta.custom_data?.user_id;

  // Unknown order — no user_id attached, ignore safely
  if (!userId) {
    console.warn(`[LS webhook] ${event}: no user_id in custom_data — ignoring`);
    return NextResponse.json({ ok: true });
  }

  const adminUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminUrl || !adminKey) {
    console.error("[LS webhook] Supabase admin credentials not configured");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const admin = createAdminClient(adminUrl, adminKey);

  try {
    await routeEvent(admin, event, userId, payload);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[LS webhook] Error handling ${event}:`, err);
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
  payload: LsWebhookPayload
) {
  const { data: entity } = payload;
  const attrs = entity.attributes;
  const lsId = entity.id;

  switch (event) {
    case "order_created": {
      // One-time purchase (Founder LTD) — variant_id from first_order_item
      const variantId = String(attrs.first_order_item?.variant_id ?? attrs.variant_id);
      const planType = getPlanType(variantId);
      if (!planType) break;

      await upsertSubscription(admin, {
        userId,
        lsSubscriptionId: null,
        lsOrderId: lsId,
        planType,
        status: "active",
        currentPeriodEnd: null,
      });
      await setPlan(admin, userId, planType);
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
      });
      await setPlan(admin, userId, planType);
      break;
    }

    case "subscription_updated": {
      await admin
        .from("subscriptions")
        .update({
          status: attrs.status,
          current_period_end: attrs.renews_at ?? attrs.ends_at ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("ls_subscription_id", lsId);
      break;
    }

    case "subscription_cancelled": {
      await admin
        .from("subscriptions")
        .update({
          status: "cancelled",
          current_period_end: attrs.ends_at ?? attrs.renews_at ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("ls_subscription_id", lsId);
      // Access continues until period_end — do NOT change profiles.plan yet
      break;
    }

    case "subscription_payment_success": {
      // Recurring payment succeeded — refresh period end and keep status active
      await admin
        .from("subscriptions")
        .update({
          status: "active",
          current_period_end: attrs.renews_at ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("ls_subscription_id", lsId);
      break;
    }

    case "subscription_expired": {
      await admin
        .from("subscriptions")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("ls_subscription_id", lsId);
      // Revoke paid access
      await setPlan(admin, userId, "free");
      break;
    }

    default:
      // Unknown event — log and ignore
      console.log(`[LS webhook] Unhandled event: ${event}`);
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
}

async function upsertSubscription(admin: AdminClient, row: SubscriptionRow) {
  const record = {
    user_id: row.userId,
    ls_subscription_id: row.lsSubscriptionId,
    ls_order_id: row.lsOrderId,
    plan_type: row.planType,
    status: row.status,
    current_period_end: row.currentPeriodEnd,
    updated_at: new Date().toISOString(),
  };

  // Upsert on ls_subscription_id when present; otherwise upsert on ls_order_id for one-time orders.
  if (row.lsSubscriptionId) {
    await admin
      .from("subscriptions")
      .upsert(record, { onConflict: "ls_subscription_id" });
  } else {
    await admin
      .from("subscriptions")
      .upsert(record, { onConflict: "ls_order_id" });
  }
}

async function setPlan(admin: AdminClient, userId: string, plan: string) {
  await admin
    .from("profiles")
    .update({ plan, updated_at: new Date().toISOString() })
    .eq("id", userId);
}
