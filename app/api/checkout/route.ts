import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPaddleCheckoutSession } from "@/lib/paddle";
import {
  getPaddlePriceConfig,
  getAllPaddlePriceConfigs,
  getPaddleConfigSummary,
  normalizePriceId,
  isValidPaddlePriceId,
} from "@/lib/paddle-config";

export async function POST(req: NextRequest) {
  if (process.env.PAYMENTS_ENABLED !== "1") {
    return NextResponse.json(
      { error: "Checkout is not available yet.", code: "PAYMENTS_NOT_ENABLED" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { price?: string };
  try {
    body = (await req.json()) as { price?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const requestedPriceId = normalizePriceId(body.price);
  const configSummary = getPaddleConfigSummary();
  const selectedPrice = getPaddlePriceConfigFromId(requestedPriceId);

  if (!requestedPriceId) {
    return NextResponse.json(
      {
        error: "Checkout is not configured yet.",
        code: "CHECKOUT_NOT_CONFIGURED",
        missingEnv: [...configSummary.missing, ...configSummary.invalid].map(
          (config) => config.envName
        ),
      },
      { status: 503 }
    );
  }

  if (!selectedPrice) {
    if (configSummary.ready.length === 0) {
      return NextResponse.json(
        {
          error: "Checkout is not configured yet.",
          code: "CHECKOUT_NOT_CONFIGURED",
          missingEnv: [...configSummary.missing, ...configSummary.invalid].map(
            (config) => config.envName
          ),
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Invalid checkout price.", code: "INVALID_PRICE" },
      { status: 400 }
    );
  }

  const checkoutUrl = await createPaddleCheckoutSession({
    priceId: selectedPrice.priceId,
    email: user.email,
    userId: user.id,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!checkoutUrl) {
    return NextResponse.json(
      { error: "Failed to create checkout session.", code: "CHECKOUT_CREATE_FAILED" },
      { status: 500 }
    );
  }

  // Return the URL as JSON so the client can navigate without opaque-redirect issues.
  // (fetch with redirect:"manual" makes 307 responses opaque — Location header inaccessible)
  return NextResponse.json({ url: checkoutUrl });
}

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Find a valid Paddle price config by price ID.
 * Mirrors the LS findCheckoutVariantConfig pattern for Paddle.
 */
function getPaddlePriceConfigFromId(priceId?: string | null) {
  const normalized = normalizePriceId(priceId);
  if (!normalized) return null;

  return (
    getAllPaddlePriceConfigs().find(
      (config) => config.state === "ready" && config.priceId === normalized
    ) ?? null
  );
}
