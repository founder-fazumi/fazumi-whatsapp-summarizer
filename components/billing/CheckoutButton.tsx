"use client";

import { useState } from "react";
import { useLang } from "@/lib/context/LangContext";
import { BILLING_CONTACT_EMAIL } from "@/lib/config/legal";
import { lsVariantsConfigured } from "@/lib/config/public";
import {
  isValidCheckoutVariantId,
  normalizeVariantId,
} from "@/lib/lemonsqueezy-config";
import { paymentsComingSoon } from "@/lib/payments-ui";

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
  const checkoutState = !paymentsComingSoon &&
    lsVariantsConfigured &&
    normalizedVariantId &&
    isValidCheckoutVariantId(normalizedVariantId)
    ? "ready"
    : "contact_billing";

  function handleContactBilling() {
    setLoading(true);
    const subject =
      locale === "ar"
        ? "استفسار عن خطة مدفوعة في فازومي"
        : "Fazumi paid plan request";
    const body =
      locale === "ar"
        ? "مرحبًا، أريد المساعدة بخصوص خطة مدفوعة في فازومي."
        : "Hello, I would like help with a paid Fazumi plan.";
    window.location.href =
      `mailto:${BILLING_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant: normalizedVariantId }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        console.error("[checkout]", json.error ?? res.status);
        setLoading(false);
        return;
      }
      const { url } = (await res.json()) as { url: string };
      if (url) {
        window.location.href = url;
      }
    } catch {
      setLoading(false);
    }
  }

  if (checkoutState !== "ready") {
    return (
      <button
        type="button"
        onClick={handleContactBilling}
        disabled={loading}
        className={className}
      >
        {loading ? (locale === "ar" ? "جارٍ الفتح…" : "Opening…") : children}
      </button>
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
