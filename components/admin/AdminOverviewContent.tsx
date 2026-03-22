"use client";

import { startTransition, useState } from "react";
import {
  CircleAlert,
  DollarSign,
  FileText,
  RefreshCcw,
  TrendingDown,
  Users,
  UserPlus,
  Zap,
  Inbox,
  Star,
} from "lucide-react";
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
  const [metrics, setMetrics] = useState(initialMetrics);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const m = metrics;

  // Primary KPI strip — 6 cards
  const primaryKpis = [
    {
      icon: DollarSign,
      label: locale === "ar" ? "الإيراد الشهري المتكرر" : "MRR",
      value: `$${m.revenue.mrr.toLocaleString("en-US")}`,
      delta: { value: m.revenue.mrrTrend, window: "vs prev" },
    },
    {
      icon: UserPlus,
      label: locale === "ar" ? "مستخدمون جدد (7 أيام)" : "New signups (7d)",
      value: formatNumber(m.newUsers.last7Days),
      subtext: `Today: ${formatNumber(m.newUsers.today)}`,
    },
    {
      icon: Users,
      label: locale === "ar" ? "المستخدمون النشطون (MAU)" : "Active users (MAU)",
      value: formatNumber(m.engagement.mau),
      subtext: `DAU: ${formatNumber(m.engagement.dau)}`,
    },
    {
      icon: TrendingDown,
      label: locale === "ar" ? "معدل التسرب" : "Churn rate",
      value: `${formatNumber(m.churn.churnRate, { maximumFractionDigits: 1 })}%`,
      delta: { value: m.churn.churnTrend, window: "vs prev" },
      variant: "warning" as const,
    },
    {
      icon: Zap,
      label: locale === "ar" ? "تحويل التجربة" : "Trial conversion",
      value: `${formatNumber(m.conversion.trialConversion, { maximumFractionDigits: 1 })}%`,
      subtext: `${formatNumber(m.conversion.convertedTrialUsers)} converted`,
    },
    {
      icon: FileText,
      label: locale === "ar" ? "ملخصات اليوم" : "Summaries today",
      value: formatNumber(m.aiUsage.requestsToday ?? m.overviewKpis.summaries.today),
      subtext: `7d: ${formatNumber(m.overviewKpis.summaries.last7Days)}`,
    },
  ];

  // Secondary KPI strip — inbox + founder + revenue MTD + AI spend
  const secondaryKpis = [
    {
      icon: Inbox,
      label: "New inbox items",
      value: formatNumber((m.overviewKpis.supportNew ?? 0) + (m.overviewKpis.feedbackNew ?? 0)),
      subtext: `Support: ${m.overviewKpis.supportNew ?? 0} · Feedback: ${m.overviewKpis.feedbackNew ?? 0}`,
      href: "/admin-dashboard/inbox",
    },
    {
      icon: Star,
      label: "Founder seats",
      value: `${formatNumber(m.founder.sold)} / ${formatNumber(m.founder.capacity)}`,
      subtext: `${formatNumber(m.founder.remaining)} remaining`,
    },
    {
      icon: DollarSign,
      label: "Revenue MTD",
      value: `$${formatNumber(m.overviewKpis.revenueMtdUsd ?? 0, { maximumFractionDigits: 0 })}`,
      subtext: `ARR: $${m.revenue.arr.toLocaleString("en-US")}`,
    },
    {
      icon: Zap,
      label: "AI spend (7d)",
      value: `$${formatNumber(m.aiUsage.spendLast7Days, { maximumFractionDigits: 2 })}`,
      subtext: `$/summary: $${formatNumber(m.aiUsage.costPerSummary, { maximumFractionDigits: 4 })}`,
      href: "/admin-dashboard/ai-usage",
    },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={locale === "ar" ? "نظرة عامة" : "Command Centre"}
        description={`${formatDate(metrics.generatedAt, locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => startTransition(() => void refreshMetrics())}
            disabled={refreshing}
          >
            <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? (locale === "ar" ? "جارٍ التحديث..." : "Refreshing...") : (locale === "ar" ? "تحديث" : "Refresh")}
          </Button>
        }
      />

      {error ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]" role="alert">
          {error}
        </div>
      ) : null}

      {/* Primary KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {primaryKpis.map((item) => (
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

      {/* Secondary KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {secondaryKpis.map((item) => (
          <SecondaryKpiCard key={item.label} item={item} />
        ))}
      </div>

      {/* Needs attention */}
      {m.attention.length > 0 ? (
        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader className="space-y-2">
            <h2 className="text-xl font-semibold text-[var(--text-strong)]">
              {locale === "ar" ? "يحتاج انتباهًا" : "Needs attention"}
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {locale === "ar" ? "بنود تشغيلية تستحق فحصًا يدويًا." : "Operational items that deserve a manual check."}
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {m.attention.map((item) => (
              <div key={item.id} className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center gap-2">
                  <CircleAlert
                    className={cn(
                      "h-4 w-4",
                      item.severity === "critical"
                        ? "text-[var(--destructive)]"
                        : item.severity === "warning"
                          ? "text-amber-600"
                          : "text-[var(--primary)]"
                    )}
                  />
                  <Badge
                    variant="outline"
                    className={
                      item.severity === "critical"
                        ? "border-[var(--destructive)]/20 bg-[var(--destructive)]/10 text-[var(--destructive)]"
                        : item.severity === "warning"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
                          : "border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary)]"
                    }
                  >
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
      ) : null}

      {/* Trend charts */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)]">
        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              {locale === "ar" ? "حجم الملخصات" : "Summary volume"}
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {locale === "ar" ? "اتجاه 30 يومًا للملخصات المُنشأة." : "30-day trend for generated summaries."}
            </p>
          </CardHeader>
          <CardContent>
            <AdminLineChart points={m.health.summaryTrend30Days} color="#247052" />
          </CardContent>
        </Card>

        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              {locale === "ar" ? "مخاطر تكلفة OpenAI" : "OpenAI cost risk"}
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {locale === "ar" ? "اتجاه الإنفاق خلال 30 يومًا." : "30-day AI spend trend."}
            </p>
          </CardHeader>
          <CardContent>
            <AdminLineChart points={m.health.aiSpendTrend30Days} color="#d4a373" />
          </CardContent>
        </Card>

        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              {locale === "ar" ? "أحدث الإخفاقات" : "Recent failures"}
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Sentry {m.health.sentryConfigured ? "configured" : "not configured"}.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {m.health.recentWebhookFailures.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                {locale === "ar"
                  ? "لا توجد عمليات تسليم ويب هوك فاشلة في آخر 7 أيام."
                  : "No failed webhook deliveries in the last 7 days."}
              </p>
            ) : (
              m.health.recentWebhookFailures.map((row) => (
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
            <a href={m.health.sentryUrl} className="inline-flex text-sm font-medium text-[var(--primary)] hover:underline">
              {locale === "ar" ? "فتح Sentry" : "Open Sentry"}
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Growth pulse + Recent subscriptions */}
      <div className="grid gap-4 lg:grid-cols-2">
        {m.growthPulse.sevenDayMomentum.length > 0 ? (
          <Card className="bg-[var(--surface-elevated)]">
            <CardHeader>
              <h2 className="text-lg font-semibold text-[var(--text-strong)]">Growth pulse (7d)</h2>
              <p className="text-sm text-[var(--muted-foreground)]">MRR momentum over last 7 days.</p>
            </CardHeader>
            <CardContent>
              <AdminLineChart points={m.growthPulse.sevenDayMomentum} color="#6366f1" />
            </CardContent>
          </Card>
        ) : null}

        {m.founderInsights.recentSubscriptions.length > 0 ? (
          <Card className="bg-[var(--surface-elevated)]">
            <CardHeader>
              <h2 className="text-lg font-semibold text-[var(--text-strong)]">Recent subscriptions</h2>
              <p className="text-sm text-[var(--muted-foreground)]">Latest subscription events.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {m.founderInsights.recentSubscriptions.slice(0, 5).map((sub) => (
                <div key={sub.id} className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-strong)]">
                      {sub.email ?? sub.reference ?? sub.userId.slice(0, 8)}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {formatDate(sub.eventAt, locale, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {sub.planType}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Plan distribution */}
      {m.revenueIntelligence.planDistribution.length > 0 ? (
        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">Plan mix</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {locale === "ar" ? "توزيع الخطط الحالية." : "Current plan distribution by revenue."}
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                  <th className="px-4 py-2 text-start font-medium">Plan</th>
                  <th className="px-4 py-2 text-end font-medium">Subscribers</th>
                  <th className="px-4 py-2 text-end font-medium">Est. revenue</th>
                </tr>
              </thead>
              <tbody>
                {m.revenueIntelligence.planDistribution.map((row) => (
                  <tr key={row.planType} className="border-t border-[var(--border)]">
                    <td className="px-4 py-2 font-medium capitalize text-[var(--text-strong)]">{row.planType}</td>
                    <td className="px-4 py-2 text-end text-[var(--muted-foreground)]">{formatNumber(row.purchases)}</td>
                    <td className="px-4 py-2 text-end text-[var(--muted-foreground)]">
                      ${formatNumber(row.estimatedRevenue, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {/* User totals */}
      <Card className="bg-[var(--surface-elevated)]">
        <CardHeader>
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">
            {locale === "ar" ? "توزيع المستخدمين" : "User breakdown"}
          </h2>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {[
              { label: "Total accounts", value: m.totals.totalAccounts },
              { label: "Free", value: m.totals.freeUsers },
              { label: "Trial", value: m.totals.trialUsers },
              { label: "Paid", value: m.totals.paidUsers },
              { label: "Founder", value: m.totals.founderUsers },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center">
                <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
                <dd className="mt-1 text-2xl font-bold text-[var(--text-strong)]">{formatNumber(value)}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function SecondaryKpiCard({
  item,
}: {
  item: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    subtext?: string;
    href?: string;
  };
}) {
  const Icon = item.icon;
  const inner = (
    <div className="flex items-start gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-4 transition-colors hover:bg-[var(--surface-muted)]">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
      <div className="min-w-0">
        <p className="text-xs text-[var(--muted-foreground)]">{item.label}</p>
        <p className="mt-0.5 text-lg font-bold text-[var(--text-strong)]">{item.value}</p>
        {item.subtext ? (
          <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{item.subtext}</p>
        ) : null}
      </div>
    </div>
  );

  if (item.href) {
    return <a href={item.href}>{inner}</a>;
  }

  return inner;
}
