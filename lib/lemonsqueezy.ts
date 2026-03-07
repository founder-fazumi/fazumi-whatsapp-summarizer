import { createHmac, timingSafeEqual } from "crypto";
import {
  findCheckoutVariantConfig,
  type PlanType,
} from "@/lib/lemonsqueezy-config";

// ── Checkout URL ────────────────────────────────────────────────────────────

interface CheckoutParams {
  variantId: string;
  email: string;
  userId: string;
  appUrl?: string;
}

export function buildCheckoutUrl({ variantId, email, userId, appUrl }: CheckoutParams): string {
  const base = `https://fazumi.lemonsqueezy.com/checkout/buy/${variantId}`;
  const url = new URL(base);
  url.searchParams.set("checkout[email]", email);
  url.searchParams.set("checkout[custom][user_id]", userId);
  url.searchParams.set(
    "checkout[success_url]",
    `${appUrl ?? "https://fazumi.app"}/dashboard?upgraded=1`
  );
  url.searchParams.set("checkout[cancel_url]", `${appUrl ?? "https://fazumi.app"}/pricing`);
  return url.toString();
}

// ── Webhook signature ───────────────────────────────────────────────────────

export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const hmac = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(hmac);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ── Plan type mapping ───────────────────────────────────────────────────────

export function getPlanType(variantId: string): PlanType | null {
  return findCheckoutVariantConfig(variantId)?.plan ?? null;
}

// ── Customer portal URL ─────────────────────────────────────────────────────

export async function getCustomerPortalUrl(lsSubscriptionId: string): Promise<string | null> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${lsSubscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/vnd.api+json",
        },
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { attributes?: { urls?: { customer_portal?: string } } };
    };
    return json.data?.attributes?.urls?.customer_portal ?? null;
  } catch {
    return null;
  }
}
