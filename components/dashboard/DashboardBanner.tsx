"use client";

import Link from "next/link";
import { ArrowUpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLang } from "@/lib/context/LangContext";
import { t } from "@/lib/i18n";

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

function planBadge(plan: string, trialExpiresAt?: string | null) {
  if (["monthly", "annual", "founder"].includes(plan)) return { label: "Pro", color: "bg-[var(--primary)] text-white" };
  if (trialExpiresAt && new Date(trialExpiresAt) > new Date()) return { label: "Free Trial", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
  return { label: "Free", color: "bg-[var(--muted)] text-[var(--muted-foreground)]" };
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

  const STATS = [
    { icon: "📋", label: t("dash.summaries", locale), value: `${summariesUsed}/${summariesLimit}` },
    { icon: "⏱️", label: "Time Saved", value: `${summariesUsed * 4} min` },
    { icon: "🔥", label: "Streak", value: "5 days" },
  ];

  return (
    <Card className="mb-5 overflow-hidden border-0 bg-gradient-to-br from-[var(--mint-wash)]/30 via-[var(--card-tint)] to-[var(--bg-2)]">
      <CardContent className="py-5 px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-[var(--foreground)] leading-snug">
                {t("dash.greeting", locale)}, {userName ?? "there"} 👋
              </h1>
              <span className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              Here&apos;s what&apos;s important from your school chats today
            </p>

            {/* Trial countdown */}
            {isTrialActive && !isPaid && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">
                    Trial: <strong className="text-[var(--foreground)]">{daysLeft}</strong> {t("dash.trial.days", locale)}
                  </span>
                  <span className="text-[var(--muted-foreground)]">Day {7 - daysLeft}/7</span>
                </div>
                <Progress value={7 - daysLeft} max={7} className="h-1.5" />
              </div>
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
