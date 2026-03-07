"use client";

import { useState } from "react";
import { useLang } from "@/lib/context/LangContext";
import { lsVariantsConfigured } from "@/lib/config/public";
import {
  isValidCheckoutVariantId,
  normalizeVariantId,
} from "@/lib/lemonsqueezy-config";

interface Props {
  variantId: string;
  children: React.ReactNode;
  className?: string;
  isLoggedIn?: boolean;
}

export function CheckoutButton({ variantId, children, className }: Props) {
  const { locale } = useLang();
  const [loading, setLoading] = useState(false); // stays true after click (navigating away)
  const normalizedVariantId = normalizeVariantId(variantId);
  const checkoutState = !lsVariantsConfigured
    ? "billing_missing"
    : !normalizedVariantId
    ? "missing"
    : isValidCheckoutVariantId(normalizedVariantId)
      ? "ready"
      : "invalid";

  const unavailableMessage = checkoutState === "billing_missing"
    ? (locale === "ar" ? "لم يتم إعداد الدفع بعد." : "Billing is not configured yet.")
    : checkoutState === "missing"
      ? (locale === "ar"
          ? "قريبًا. سيتفعل الدفع فور إضافة معرفات الخطط."
          : "Coming soon. Checkout unlocks once plan IDs are configured.")
      : (locale === "ar"
          ? "الدفع غير متاح مؤقتًا."
          : "Checkout is temporarily unavailable.");

  function handleClick() {
    setLoading(true);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.com";
    const redirectUrl = `${appUrl}/dashboard?upgraded=1`;
    const checkoutUrl = `https://fazumi.lemonsqueezy.com/checkout/buy/${normalizedVariantId}?checkout[redirect_url]=${encodeURIComponent(redirectUrl)}`;
    window.location.href = checkoutUrl;
  }

  if (checkoutState !== "ready") {
    return (
      <>
        <button
          type="button"
          disabled
          title={unavailableMessage}
          className={className}
          aria-disabled="true"
        >
          {children}
        </button>
        <p
          className="mt-2 text-xs leading-6 text-[var(--muted-foreground)]"
          role="status"
          aria-live="polite"
        >
          {unavailableMessage}
        </p>
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? (locale === "ar" ? "جارٍ التحويل…" : "Redirecting…") : children}
    </button>
  );
}
