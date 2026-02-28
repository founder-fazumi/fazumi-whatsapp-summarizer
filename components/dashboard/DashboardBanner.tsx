"use client";

import Link from "next/link";
import { ArrowUpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber } from "@/lib/format";
import { pick, t, type LocalizedCopy } from "@/lib/i18n";

interface DashboardBannerProps {
  userName?: string | null;
  plan?: string;
  trialExpiresAt?: string | null;
  summariesUsed?: number;
  summariesLimit?: number;
}

function daysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const COPY = {
  pro: { en: "Pro", ar: "احترافي" },
  freeTrial: { en: "Free Trial", ar: "فترة تجريبية" },
  free: { en: "Free", ar: "مجاني" },
  there: { en: "there", ar: "هناك" },
  subtitle: {
    en: "Here is what matters from your school chats today.",
    ar: "إليك ما يهم من محادثات المدرسة اليوم.",
  },
  usageToday: { en: "Usage today", ar: "استخدام اليوم" },
  upgradeUsage: { en: "Upgrade to continue", ar: "قم بالترقية للمتابعة" },
  timeSaved: { en: "Time Saved", ar: "الوقت الموفَّر" },
  streak: { en: "Streak", ar: "الاستمرارية" },
} satisfies Record<string, LocalizedCopy<string>>;

function planBadge(plan: string, trialExpiresAt?: string | null) {
  if (["monthly", "annual", "founder"].includes(plan)) return { labelKey: "pro", color: "bg-[var(--primary)] text-white" };
  if (trialExpiresAt && new Date(trialExpiresAt) > new Date()) return { labelKey: "freeTrial", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
  return { labelKey: "free", color: "bg-[var(--muted)] text-[var(--muted-foreground)]" };
}

export function DashboardBanner({
  userName,
  plan = "free",
  trialExpiresAt,
  summariesUsed = 0,
  summariesLimit = 3,
}: DashboardBannerProps) {
  const { locale } = useLang();
  const daysLeft = daysUntil(trialExpiresAt);
  const badge = planBadge(plan, trialExpiresAt);
  const isPaid = ["monthly", "annual", "founder"].includes(plan);
  const isTrialActive = !!trialExpiresAt && new Date(trialExpiresAt) > new Date();
  const showUpgrade = !isPaid;
  const progressMax = summariesLimit > 0 ? summariesLimit : 1;
  const progressValue = summariesLimit > 0 ? Math.min(summariesUsed, summariesLimit) : 0;
  const usageLabel = summariesLimit > 0
    ? `${formatNumber(summariesUsed)}/${formatNumber(summariesLimit)}`
    : pick(COPY.upgradeUsage, locale);

  const STATS = [
    { icon: "📋", label: t("dash.summaries", locale), value: usageLabel },
    { icon: "⏱️", label: pick(COPY.timeSaved, locale), value: locale === "ar" ? `${formatNumber(summariesUsed * 4)} دقيقة` : `${formatNumber(summariesUsed * 4)} min` },
    { icon: "🔥", label: pick(COPY.streak, locale), value: locale === "ar" ? `${formatNumber(0)} أيام` : `${formatNumber(0)} days` },
  ];

  return (
    <Card className="mb-5 overflow-hidden border-0 bg-gradient-to-br from-[var(--mint-wash)]/30 via-[var(--card-tint)] to-[var(--bg-2)]">
      <CardContent className="py-5 px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-[var(--foreground)] leading-snug">
                {t("dash.greeting", locale)}, {userName ?? pick(COPY.there, locale)} 👋
              </h1>
              <span className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.color}`}>
                {pick(COPY[badge.labelKey as keyof typeof COPY], locale)}
              </span>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {pick(COPY.subtitle, locale)}
            </p>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--muted-foreground)]">
                  {pick(COPY.usageToday, locale)}
                </span>
                <span className="text-[var(--muted-foreground)]">
                  {usageLabel}
                </span>
              </div>
              <Progress value={progressValue} max={progressMax} className="h-1.5" />
            </div>

            {isTrialActive && !isPaid && (
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                {locale === "ar"
                  ? `متبقٍ ${formatNumber(daysLeft)} ${t("dash.trial.days", locale)}`
                  : `${formatNumber(daysLeft)} ${t("dash.trial.days", locale)}`}
              </p>
            )}

            {/* Stats row */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              {STATS.map(({ icon, label, value }, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span className="hidden sm:block w-px h-4 bg-[var(--border)] mr-3" />
                  )}
                  <span className="text-sm">{icon}</span>
                  <div>
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">{label}</span>
                    <span className="ml-1.5 text-sm font-bold text-[var(--foreground)]">{value}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Upgrade CTA for free users */}
            {showUpgrade && (
              <Link
                href="/billing"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--primary-hover)] transition-colors"
              >
                <ArrowUpCircle className="h-3.5 w-3.5" />
                {t("dash.upgrade", locale)}
              </Link>
            )}
          </div>

          {/* Mascot */}
          <div className="hidden sm:flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-5xl select-none">
            🦊
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
