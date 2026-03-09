"use client";

import { startTransition, useState } from "react";
import { CircleAlert, DollarSign, FileText, RefreshCcw, TrendingDown, Users } from "lucide-react";
import type { AdminOverviewMetrics } from "@/lib/admin/types";
import { formatDate, formatNumber } from "@/lib/format";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";
import { useLang } from "@/lib/context/LangContext";
import { AdminLineChart } from "@/components/admin/AdminLineChart";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COPY = {
  en: {
    title: "Overview",
    refresh: "Refresh",
    refreshing: "Refreshing...",
    needsAttention: "Needs attention",
    needsAttentionSub: "Operational items that deserve a manual check.",
    summaryVolume: "Summary volume",
    summaryVolumeSub: "30-day trend for generated summaries.",
    aiCostRisk: "OpenAI cost risk",
    aiCostRiskSub: "30-day spend trend with no client-side secret exposure.",
    recentFailures: "Recent failures",
    noFailures: "No failed webhook deliveries logged in the last 7 days.",
    openSentry: "Open Sentry",
    kpis: {
      mrr: "MRR",
      activeUsers: "Active users",
      summariesToday: "Summaries today",
      churnRate: "Churn rate",
      previousPeriod: "vs prev",
    },
  },
  ar: {
    title: "نظرة عامة",
    refresh: "تحديث",
    refreshing: "جارٍ التحديث...",
    needsAttention: "يحتاج انتباهًا",
    needsAttentionSub: "بنود تشغيلية تستحق فحصًا يدويًا.",
    summaryVolume: "حجم الملخصات",
    summaryVolumeSub: "اتجاه 30 يومًا للملخصات المُنشأة.",
    aiCostRisk: "مخاطر تكلفة OpenAI",
    aiCostRiskSub: "اتجاه الإنفاق خلال 30 يومًا دون كشف أسرار على جانب العميل.",
    recentFailures: "أحدث الإخفاقات",
    noFailures: "لا توجد عمليات تسليم ويب هوك فاشلة مسجلة في آخر 7 أيام.",
    openSentry: "فتح Sentry",
    kpis: {
      mrr: "الإيراد الشهري المتكرر",
      activeUsers: "المستخدمون النشطون",
      summariesToday: "ملخصات اليوم",
      churnRate: "معدل التسرب",
      previousPeriod: "مقابل السابق",
    },
  },
} as const;

async function fetchMetrics() {
  const response = await fetch("/api/admin/metrics", { cache: "no-store" });
  const payload = (await response.json()) as { ok: boolean; data?: AdminOverviewMetrics; error?: string };

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Could not load overview metrics.");
  }

  return payload.data;
}

export function AdminOverviewContent({ initialMetrics }: { initialMetrics: AdminOverviewMetrics }) {
  const { locale } = useLang();
  const copy = COPY[locale];
  const [metrics, setMetrics] = useState(initialMetrics);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kpis = [
    {
      icon: DollarSign,
      label: copy.kpis.mrr,
      value: `$${metrics.revenue.mrr.toLocaleString("en-US")}`,
      delta: { value: metrics.revenue.mrrTrend, window: copy.kpis.previousPeriod },
    },
    {
      icon: Users,
      label: copy.kpis.activeUsers,
      value: formatNumber(metrics.engagement.mau),
    },
    {
      icon: FileText,
      label: copy.kpis.summariesToday,
      value: formatNumber(metrics.aiUsage.requestsToday ?? metrics.overviewKpis.summaries.today),
    },
    {
      icon: TrendingDown,
      label: copy.kpis.churnRate,
      value: `${formatNumber(metrics.churn.churnRate, { maximumFractionDigits: 1 })}%`,
      delta: { value: metrics.churn.churnTrend, window: copy.kpis.previousPeriod },
      variant: "warning" as const,
    },
  ];

  async function refreshMetrics() {
    setRefreshing(true);
    setError(null);
    try {
      setMetrics(await fetchMetrics());
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not refresh metrics.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={copy.title}
        description={`${formatDate(metrics.generatedAt, locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => startTransition(() => void refreshMetrics())} disabled={refreshing}>
              <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? copy.refreshing : copy.refresh}
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((item) => (
          <AdminKpiCard
            key={item.label}
            label={item.label}
            value={item.value}
            delta={item.delta}
            sparkData={[]}
            icon={item.icon}
            variant={item.variant}
          />
        ))}
      </div>

      <Card className="bg-[var(--surface-elevated)]">
        <CardHeader className="space-y-2">
          <h2 className="text-xl font-semibold text-[var(--text-strong)]">{copy.needsAttention}</h2>
          <p className="text-sm text-[var(--muted-foreground)]">{copy.needsAttentionSub}</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {metrics.attention.map((item) => (
            <div key={item.id} className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-2">
                <CircleAlert className={cn("h-4 w-4", item.severity === "critical" ? "text-[var(--destructive)]" : item.severity === "warning" ? "text-amber-600" : "text-[var(--primary)]")} />
                <Badge variant="outline" className={item.severity === "critical" ? "border-[var(--destructive)]/20 bg-[var(--destructive)]/10 text-[var(--destructive)]" : item.severity === "warning" ? "border-amber-500/20 bg-amber-500/10 text-amber-700" : "border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary)]"}>
                  {item.severity}
                </Badge>
              </div>
              <p className="mt-3 font-semibold text-[var(--text-strong)]">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.body}</p>
              {item.href ? (
                <a href={item.href} className="mt-3 inline-flex text-sm font-medium text-[var(--primary)] hover:underline">
                  {item.ctaLabel ?? "Open"}
                </a>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)]">
        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">{copy.summaryVolume}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{copy.summaryVolumeSub}</p>
          </CardHeader>
          <CardContent>
            <AdminLineChart points={metrics.health.summaryTrend30Days} color="#247052" />
          </CardContent>
        </Card>

        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">{copy.aiCostRisk}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{copy.aiCostRiskSub}</p>
          </CardHeader>
          <CardContent>
            <AdminLineChart points={metrics.health.aiSpendTrend30Days} color="#d4a373" />
          </CardContent>
        </Card>

        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">{copy.recentFailures}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Sentry {metrics.health.sentryConfigured ? "configured" : "not configured"}.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.health.recentWebhookFailures.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">{copy.noFailures}</p>
            ) : (
              metrics.health.recentWebhookFailures.map((row) => (
                <div key={row.id} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--text-strong)]">{row.eventName ?? row.provider}</p>
                    <Badge variant="outline" className="border-[var(--destructive)]/20 bg-[var(--destructive)]/10 text-[var(--destructive)]">
                      {row.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">{row.errorCode ?? row.errorMessage ?? "Unknown webhook failure"}</p>
                </div>
              ))
            )}
            <a href={metrics.health.sentryUrl} className="inline-flex text-sm font-medium text-[var(--primary)] hover:underline">
              {copy.openSentry}
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
