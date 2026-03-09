"use client";

import { useEffect, useState } from "react";
import type { AdminIncomeData } from "@/lib/admin/types";
import { formatCurrency, formatNumber } from "@/lib/format";

type TierId = "free" | "monthly" | "annual" | "founder";

interface AdminPricingTiersProps {
  data: AdminIncomeData;
  locale?: "en" | "ar";
}

interface TierMetrics {
  userCount: number;
  mrr: number;
  arpu: number;
}

const TIER_ORDER = ["free", "monthly", "annual", "founder"] as const satisfies readonly TierId[];

const TIER_NAMES: Record<TierId, { en: string; ar: string }> = {
  free: { en: "Free", ar: "مجاني" },
  monthly: { en: "Monthly", ar: "شهري" },
  annual: { en: "Annual", ar: "سنوي" },
  founder: { en: "Founder", ar: "مؤسس" },
};

const TIER_COLORS: Record<TierId, { solid: string; light: string }> = {
  free: { solid: "#6b7280", light: "#9ca3af" },
  monthly: { solid: "#8b5cf6", light: "#c4b5fd" },
  annual: { solid: "#0ea5e9", light: "#7dd3fc" },
  founder: { solid: "#f59e0b", light: "#fcd34d" },
};

const COPY = {
  en: {
    users: "Users",
    mrr: "MRR",
    arpu: "ARPU",
    popular: "Popular",
    seats: "seats",
  },
  ar: {
    users: "المستخدمون",
    mrr: "الإيراد الشهري",
    arpu: "ARPU",
    popular: "الأكثر شيوعاً",
    seats: "مقعد",
  },
} as const;

function useCountUp(target: number, duration = 800): number {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setDisplayed(0);
      return;
    }

    let frameId = 0;
    let start: number | null = null;

    setDisplayed(0);

    const step = (timestamp: number) => {
      if (start === null) {
        start = timestamp;
      }

      const progress = Math.min((timestamp - start) / duration, 1);
      const nextValue = progress >= 1 ? target : Math.floor(progress * target);

      setDisplayed(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
      }
    };

    frameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [duration, target]);

  return displayed;
}

function isTierId(value: string): value is TierId {
  return value === "free" || value === "monthly" || value === "annual" || value === "founder";
}

function readNumber(source: Record<string, unknown>, key: string): number | null {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function findTierRow(data: AdminIncomeData, tier: TierId): Record<string, unknown> | null {
  for (const entry of data.breakdown) {
    const row = entry as unknown as Record<string, unknown>;
    const rawPlan = typeof row.plan === "string" ? row.plan : typeof row.planType === "string" ? row.planType : null;
    if (rawPlan && isTierId(rawPlan) && rawPlan === tier) {
      return row;
    }
  }

  return null;
}

function getTierMetrics(data: AdminIncomeData, tier: TierId): TierMetrics {
  const row = findTierRow(data, tier);

  if (!row) {
    return {
      userCount: tier === "founder" ? data.counts.founderUsers : 0,
      mrr: 0,
      arpu: 0,
    };
  }

  const mrr = readNumber(row, "mrr") ?? readNumber(row, "estimatedRevenue") ?? 0;
  const fallbackUsers =
    tier === "founder"
      ? data.counts.founderUsers
      : tier === "monthly" || tier === "annual"
        ? readNumber(row, "purchases") ?? 0
        : 0;
  const userCount = readNumber(row, "userCount") ?? fallbackUsers;
  const arpu = readNumber(row, "arpu") ?? (userCount > 0 ? mrr / userCount : 0);

  return {
    userCount,
    mrr,
    arpu,
  };
}

function TierCard({
  tier,
  metrics,
  currency,
  locale,
  isPopular,
  founderCount,
}: {
  tier: TierId;
  metrics: TierMetrics;
  currency: "USD" | "QAR";
  locale: "en" | "ar";
  isPopular: boolean;
  founderCount: number;
}) {
  const displayedMrr = useCountUp(metrics.mrr);
  const colors = TIER_COLORS[tier];
  const copy = COPY[locale];
  const seatWidth = `${Math.min((founderCount / 200) * 100, 100)}%`;

  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-4 ${locale === "ar" ? "font-arabic" : ""}`}
    >
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ backgroundImage: `linear-gradient(90deg, ${colors.solid}, ${colors.light})` }}
      />

      {isPopular ? (
        <span className="absolute top-3 end-3 rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
          {copy.popular}
        </span>
      ) : null}

      <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: colors.solid }}>
        {TIER_NAMES[tier][locale]}
      </div>

      <div className="mt-4">
        <div className="text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
          {formatCurrency(displayedMrr, currency, displayedMrr % 1 === 0 ? 0 : 2)}
        </div>
        <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {copy.mrr}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            {copy.users}
          </div>
          <div className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
            {formatNumber(metrics.userCount)}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            {copy.arpu}
          </div>
          <div className="mt-1 text-sm font-medium text-[var(--text-strong)]">
            {formatCurrency(metrics.arpu, currency, metrics.arpu % 1 === 0 ? 0 : 2)}
          </div>
        </div>
      </div>

      {tier === "founder" ? (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
            <span>
              {formatNumber(founderCount)} / 200 {copy.seats}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-700"
              style={{ width: seatWidth }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AdminPricingTiers({
  data,
  locale = "en",
}: AdminPricingTiersProps) {
  const currentLocale = locale === "ar" ? "ar" : "en";
  const currency = data.currency === "QAR" ? "QAR" : "USD";
  const tierMetrics = {
    free: getTierMetrics(data, "free"),
    monthly: getTierMetrics(data, "monthly"),
    annual: getTierMetrics(data, "annual"),
    founder: getTierMetrics(data, "founder"),
  } satisfies Record<TierId, TierMetrics>;
  const founderCount = tierMetrics.founder.userCount;
  const highestMrr = Math.max(...TIER_ORDER.map((tier) => tierMetrics[tier].mrr));
  const popularTier = highestMrr > 0 ? TIER_ORDER.find((tier) => tierMetrics[tier].mrr === highestMrr) : null;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {TIER_ORDER.map((tier) => (
        <TierCard
          key={tier}
          tier={tier}
          metrics={tierMetrics[tier]}
          currency={currency}
          locale={currentLocale}
          isPopular={popularTier === tier}
          founderCount={founderCount}
        />
      ))}
    </div>
  );
}
