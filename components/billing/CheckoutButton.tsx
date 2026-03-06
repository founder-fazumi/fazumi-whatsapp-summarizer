"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export function CheckoutButton({ variantId, children, className, isLoggedIn = false }: Props) {
  const router = useRouter();
  const { locale } = useLang();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedVariantId = normalizeVariantId(variantId);
  const checkoutState = !lsVariantsConfigured
    ? "billing_missing"
    : !normalizedVariantId
    ? "missing"
    : isValidCheckoutVariantId(normalizedVariantId)
      ? "ready"
      : "invalid";
  const billingNotConfiguredMessage =
    locale === "ar" ? "لم يتم إعداد الدفع بعد." : "Billing is not configured yet.";

  const unavailableMessage = checkoutState === "billing_missing"
    ? billingNotConfiguredMessage
    : checkoutState === "missing"
      ? locale === "ar"
        ? "قريبًا. سيتفعل الدفع فور إضافة معرفات خطط Lemon Squeezy."
        : "Coming soon. Checkout unlocks once the Lemon Squeezy plan IDs are configured."
      : locale === "ar"
        ? "الدفع غير متاح مؤقتًا لأن إعداد هذه الخطة غير صحيح."
        : "Checkout is temporarily unavailable because this plan is misconfigured.";

  async function handleClick() {
    if (!isLoggedIn) {
      router.push("/login?next=/pricing");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant: normalizedVariantId }),
        redirect: "manual",
      });

      // The API returns a 307 redirect to LS checkout
      const location = res.headers.get("location") ?? res.url;
      if (location && location.includes("lemonsqueezy.com")) {
        window.location.href = location;
      } else if (res.status === 401) {
        router.push("/login?next=/pricing");
      } else {
        const payload = (await res.json().catch(() => null)) as
          | { error?: string; code?: string }
          | null;

        if (payload?.code === "CHECKOUT_NOT_CONFIGURED") {
          throw new Error(
            locale === "ar"
              ? "الدفع غير مهيأ بعد."
              : "Checkout is not configured yet."
          );
        }

        throw new Error(payload?.error ?? "Checkout did not return a valid redirect.");
      }
    } catch (err) {
      console.error("[Checkout] Error:", err);
      setError(
        err instanceof Error && err.message
          ? err.message
          : locale === "ar"
            ? "تعذر بدء الدفع"
            : "Could not start checkout"
      );
    } finally {
      setLoading(false);
    }
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
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className}
      >
        {loading ? (locale === "ar" ? "جارٍ التحويل…" : "Redirecting…") : children}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-[var(--destructive)]" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
    </>
  );
}
