import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildCheckoutUrl } from "@/lib/lemonsqueezy";

const VALID_VARIANTS = new Set([
  process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT,
  process.env.NEXT_PUBLIC_LS_ANNUAL_VARIANT,
  process.env.NEXT_PUBLIC_LS_FOUNDER_VARIANT,
].filter(Boolean));

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

  const variantId = body.variant?.trim();
  if (!variantId || !VALID_VARIANTS.has(variantId)) {
    return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
  }

  const checkoutUrl = buildCheckoutUrl({
    variantId,
    email: user.email,
    userId: user.id,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  });

  return NextResponse.redirect(checkoutUrl, 307);
}
