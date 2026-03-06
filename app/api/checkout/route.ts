import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildCheckoutUrl } from "@/lib/lemonsqueezy";
import {
  findCheckoutVariantConfig,
  getCheckoutConfigSummary,
  normalizeVariantId,
} from "@/lib/lemonsqueezy-config";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { variant?: string };
  try {
    body = (await req.json()) as { variant?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const requestedVariantId = normalizeVariantId(body.variant);
  const configSummary = getCheckoutConfigSummary();
  const selectedVariant = findCheckoutVariantConfig(requestedVariantId);

  if (!requestedVariantId) {
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

  if (!selectedVariant) {
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
      { error: "Invalid checkout variant.", code: "INVALID_VARIANT" },
      { status: 400 }
    );
  }

  const checkoutUrl = buildCheckoutUrl({
    variantId: selectedVariant.variantId,
    email: user.email,
    userId: user.id,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  });

  return NextResponse.redirect(checkoutUrl, 307);
}
