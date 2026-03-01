"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { Pricing } from "@/components/landing/Pricing";

interface BillingPlansPanelProps {
  isLoggedIn: boolean;
  plan: "free" | "monthly" | "annual" | "founder";
  portalUrl: string | null;
}

export function BillingPlansPanel({
  isLoggedIn,
  plan,
  portalUrl,
}: BillingPlansPanelProps) {
  const [showPlans, setShowPlans] = useState(false);
  const plansRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPlans) return;
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showPlans]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        {portalUrl && (
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-medium shadow-[var(--shadow-xs)] hover:bg-[var(--surface-muted)]"
          >
            <LocalizedText en="Manage subscription" ar="إدارة الاشتراك" />
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        <button
          type="button"
          onClick={() => setShowPlans(true)}
          className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
        >
          <LocalizedText en="View plans" ar="عرض الخطط" />
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>

      {showPlans && (
        <div ref={plansRef}>
          <Pricing isLoggedIn={isLoggedIn} currentPlan={plan} embedded sectionId="billing-plans" />
        </div>
      )}
    </div>
  );
}
