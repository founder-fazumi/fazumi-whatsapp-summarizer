"use client";

type AdminBadgeLocale = "en" | "ar";

interface ChurnRiskBadgeProps {
  lastActiveAt: string | null;
  locale?: AdminBadgeLocale;
}

const COPY = {
  active: { en: "Active", ar: "نشط" },
  atRisk: { en: "At Risk", ar: "في خطر" },
  inactive: { en: "Inactive", ar: "غير نشط" },
  never: { en: "Never", ar: "أبداً" },
} as const;

export function ChurnRiskBadge({
  lastActiveAt,
  locale = "en",
}: ChurnRiskBadgeProps) {
  const lastActiveDate = lastActiveAt ? new Date(lastActiveAt) : null;

  if (!lastActiveDate || Number.isNaN(lastActiveDate.getTime())) {
    return (
      <span className="inline-flex rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
        {COPY.never[locale]}
      </span>
    );
  }

  const daysSince = (Date.now() - lastActiveDate.getTime()) / 86_400_000;

  if (daysSince < 7) {
    return (
      <span className="inline-flex rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
        {COPY.active[locale]}
      </span>
    );
  }

  if (daysSince <= 30) {
    return (
      <span className="inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
        {COPY.atRisk[locale]}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
      {COPY.inactive[locale]}
    </span>
  );
}
