"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";

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
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      <p>
        <LocalizedText
          en="Your upgrade is being processed — this usually takes a few seconds. Your plan will update automatically."
          ar="جارٍ معالجة ترقيتك — يستغرق هذا عادةً بضع ثوانٍ. ستتحدث خطتك تلقائيًا."
        />
      </p>
    </div>
  );
}
