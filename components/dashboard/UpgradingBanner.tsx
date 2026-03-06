"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { MascotArt } from "@/components/shared/MascotArt";

/**
 * Shown when the user arrives at /dashboard?upgraded=1 after a Lemon Squeezy
 * checkout. The webhook may take a few seconds to fire, so we show a
 * "processing" message and then silently reload to strip the query param.
 */
export function UpgradingBanner() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/dashboard");
    }, 6000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      data-testid="upgrading-banner"
      className="status-success mb-4 flex items-center gap-3 rounded-[var(--radius-xl)] border px-4 py-3 text-sm"
      role="status"
      aria-live="polite"
    >
      <MascotArt
        variant="celebrating"
        alt="Fazumi mascot celebrating your upgrade"
        size={72}
        className="h-14 w-14 shrink-0"
        priority
      />
      <p>
        <LocalizedText
          en="Payment received. We are syncing your new plan now and will refresh this page automatically."
          ar="تم استلام الدفعة. نقوم الآن بمزامنة خطتك الجديدة وسنحدّث الصفحة تلقائيًا."
        />
      </p>
    </div>
  );
}
