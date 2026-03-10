"use client";

import Link from "next/link";
import { ArrowUpCircle, FileText, Clock, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Progress } from "@/components/ui/progress";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber } from "@/lib/format";
import { getTimeAwareGreeting, pick, t, type LocalizedCopy } from "@/lib/i18n";
import { paymentsComingSoon, withPaymentComingSoonLabel } from "@/lib/payments-ui";

interface DashboardBannerProps {
  userName?: string | null;
  billingPlan?: string;
  trialExpiresAt?: string | null;
  summariesUsed?: number;
  summaryCount?: number;
  groupCount?: number;
  summariesLimit?: number;
  summaryCountLastWeek?: number;
  summaryCountThisWeek?: number;
}

function daysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const COPY = {
  pro: { en: "Pro", ar: "احترافي" },
  founder: { en: "Founding Supporter", ar: "مؤسس داعم" },
  freeTrial: { en: "Free Trial", ar: "فترة تجريبية" },
  free: { en: "Free", ar: "مجاني" },
  summaries: { en: "Summaries", ar: "الملخصات" },
  subtitle: {
    en: "Turn WhatsApp, Telegram, and Facebook school chats into one action-ready family dashboard with reminders, dates, and urgent follow-ups.",
    ar: "حوّل محادثات المدرسة من واتساب وتيليجرام وفيسبوك إلى لوحة عائلية واحدة جاهزة للتنفيذ مع التذكيرات والمواعيد والمتابعات العاجلة.",
  },
  founderSubtitle: {
    en: "You backed Fazumi before anyone else. Every feature you see exists because of your trust.",
    ar: "دعمت Fazumi قبل أي شخص آخر. كل ميزة تراها موجودة بسبب ثقتك.",
  },
  upgradeUsage: { en: "Upgrade to continue", ar: "قم بالترقية للمتابعة" },
  timeSaved: { en: "Time Saved", ar: "الوقت الموفَّر" },
  activeGroups: { en: "Active groups", ar: "المجموعات النشطة" },
} satisfies Record<string, LocalizedCopy<string>>;

function getSummaryDeltaLabel(params: {
  locale: "en" | "ar";
  summaryCountThisWeek?: number;
  summaryCountLastWeek?: number;
}) {
  const { locale, summaryCountThisWeek, summaryCountLastWeek } = params;

  if (
    typeof summaryCountThisWeek !== "number" ||
    typeof summaryCountLastWeek !== "number" ||
    summaryCountThisWeek <= 0 ||
    summaryCountThisWeek <= summaryCountLastWeek
  ) {
    return null;
  }

  const delta = formatNumber(summaryCountThisWeek - summaryCountLastWeek);

  return locale === "ar" ? `هذا الأسبوع ↑${delta}` : `↑${delta} this week`;
}

function planBadge(plan: string, trialExpiresAt?: string | null) {
  if (plan === "founder") {
    return {
      labelKey: "founder",
      color: "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    };
  }

  if (["monthly", "annual", "founder"].includes(plan)) {
    return { labelKey: "pro", color: "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" };
  }

  if (trialExpiresAt && new Date(trialExpiresAt) > new Date()) {
    return { labelKey: "freeTrial", color: "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]" };
  }

  return { labelKey: "free", color: "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)]" };
}

export function DashboardBanner({
  userName,
  billingPlan = "free",
  trialExpiresAt,
  summariesUsed = 0,
  summaryCount = 0,
  groupCount = 0,
  summariesLimit = 3,
  summaryCountLastWeek,
  summaryCountThisWeek,
}: DashboardBannerProps) {
  const { locale } = useLang();
  const daysLeft = daysUntil(trialExpiresAt);
  const badge = planBadge(billingPlan, trialExpiresAt);
  const isFounder = billingPlan === "founder";
  const isPaid = ["monthly", "annual", "founder"].includes(billingPlan);
  const isTrialActive = !!trialExpiresAt && new Date(trialExpiresAt) > new Date();
  const showUpgrade = !isPaid;
  const progressMax = summariesLimit > 0 ? summariesLimit : 1;
  const progressValue = summariesLimit > 0 ? Math.min(summariesUsed, summariesLimit) : 0;
  const usageLabel = summariesLimit > 0
    ? `${formatNumber(summariesUsed)}/${formatNumber(summariesLimit)}`
    : pick(COPY.upgradeUsage, locale);
  const bannerName = userName ?? t("dashboard.name.placeholder", locale);
  const greeting = `${getTimeAwareGreeting(locale)}${locale === "ar" ? "، " : ", "}${bannerName}`;
  const summaryDeltaLabel = getSummaryDeltaLabel({
    locale,
    summaryCountThisWeek,
    summaryCountLastWeek,
  });
  const upgradeLabel = paymentsComingSoon
    ? withPaymentComingSoonLabel(t("dash.upgrade", locale), locale)
    : t("dash.upgrade", locale);

  const STATS: { icon: LucideIcon; label: string; value: string; detail?: string | null }[] = [
    {
      icon: FileText,
      label: pick(COPY.summaries, locale),
      value: formatNumber(summaryCount),
      detail: summaryDeltaLabel,
    },
    {
      icon: Clock,
      label: pick(COPY.timeSaved, locale),
      value: locale === "ar" ? `${formatNumber(summaryCount * 4)} دقيقة` : `${formatNumber(summaryCount * 4)} min`,
    },
    {
      icon: Users,
      label: pick(COPY.activeGroups, locale),
      value: formatNumber(groupCount),
    },
  ];

  return (
    <Card className="hero-backdrop mb-5 overflow-hidden border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-md)]">
      <CardContent className="px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[var(--text-2xl)] font-bold text-[var(--foreground)] sm:text-[var(--text-3xl)]">
                {greeting}
              </h1>
              <span className={`hidden sm:inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${badge.color}`}>
                {pick(COPY[badge.labelKey as keyof typeof COPY], locale)}
              </span>
            </div>
            <p className="text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
              {pick(isFounder ? COPY.founderSubtitle : COPY.subtitle, locale)}
            </p>

            <div className="surface-panel mt-4 px-4 py-3 shadow-[var(--shadow-sm)]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--muted-foreground)]">
                  {t("dashboard.usage.label", locale)}
                </span>
                <span className="text-[var(--muted-foreground)]">
                  {usageLabel}
                </span>
              </div>
              <Progress value={progressValue} max={progressMax} className="mt-2 h-1.5" />
            </div>

            {isTrialActive && !isPaid && (
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                {locale === "ar"
                  ? `متبقٍ ${formatNumber(daysLeft)} ${t("dash.trial.days", locale)}`
                  : `${formatNumber(daysLeft)} ${t("dash.trial.days", locale)}`}
              </p>
            )}

            {/* Stats row */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              {STATS.map(({ icon: Icon, label, value, detail }, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span aria-hidden="true" className="hidden h-4 w-px bg-[var(--border)] sm:block" />
                  )}
                  <Icon className="h-4 w-4 text-[var(--primary)]" />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">{label}</span>
                    <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                      <span className="text-sm font-bold text-[var(--foreground)]">{value}</span>
                      {detail ? (
                        <span className="text-[10px] font-medium text-[var(--success)]">
                          {detail}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Upgrade CTA for free users */}
            {showUpgrade && (
              <Link
                href="/billing"
                className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-5 text-sm font-medium text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
              >
                <ArrowUpCircle className="h-3.5 w-3.5" />
                {upgradeLabel}
              </Link>
            )}
          </div>

          <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] sm:flex">
            <BrandLogo size="lg" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
