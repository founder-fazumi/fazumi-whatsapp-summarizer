"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

export function UpgradeBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const [isAr, setIsAr] = useState(false);
  const [hasProcessedParam, setHasProcessedParam] = useState(false);

  useEffect(() => {
    const upgraded = searchParams?.get("upgraded");

    if (hasProcessedParam || upgraded !== "1") {
      return;
    }

    setIsAr(
      typeof document !== "undefined" && document.documentElement.lang === "ar"
    );
    setIsVisible(true);
    setHasProcessedParam(true);
    router.replace("/dashboard", { scroll: false });
  }, [hasProcessedParam, router, searchParams]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsVisible(false);
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="flex items-start justify-between gap-3 rounded-[var(--radius-xl)] border border-[#16a34a]/30 bg-[var(--success,#16a34a)]/10 px-4 py-3 text-sm"
      role="status"
      aria-live="polite"
    >
      <p className="text-[var(--foreground)]">
        {isAr
          ? "تم استلام الدفع — سيتم تفعيل خطتك قريبًا. أعد التحميل إذا لم تتحدث الشارة."
          : "Payment received — your plan will activate shortly. Refresh if your plan badge doesn't update."}
      </p>
      <button
        type="button"
        onClick={() => setIsVisible(false)}
        className="shrink-0 text-[var(--foreground)]/70 transition hover:text-[var(--foreground)]"
        aria-label={isAr ? "إخفاء التنبيه" : "Dismiss banner"}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
