"use client";

import { startTransition, useMemo, useState, type ComponentType } from "react";
import {
  Activity,
  CircleAlert,
  DollarSign,
  LifeBuoy,
  MessageSquareHeart,
  RefreshCcw,
  Sparkles,
  Users,
  Webhook,
} from "lucide-react";
import type { AdminOverviewMetrics } from "@/lib/admin/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { AdminLineChart } from "@/components/admin/AdminLineChart";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RangeKey = "today" | "7d" | "30d";

async function fetchMetrics() {
  const response = await fetch("/api/admin/metrics", { cache: "no-store" });
  const payload = (await response.json()) as { ok: boolean; data?: AdminOverviewMetrics; error?: string };

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Could not load overview metrics.");
  }

  return payload.data;
}

function pickRange(value: { today: number; last7Days: number; last30Days: number }, range: RangeKey) {
  return range === "today" ? value.today : range === "7d" ? value.last7Days : value.last30Days;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="bg-[var(--surface-elevated)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{value}</p>
            <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">{detail}</p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary)]/10 text-[var(--primary)]">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminOverviewContent({ initialMetrics }: { initialMetrics: AdminOverviewMetrics }) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [range, setRange] = useState<RangeKey>("7d");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rangeLabel = range === "today" ? "Today" : range === "7d" ? "7 days" : "30 days";
  const kpis = useMemo(
    () => [
      {
        icon: Users,
        label: "New users",
        value: formatNumber(pickRange(metrics.overviewKpis.newUsers, range)),
        detail: `${rangeLabel} window`,
      },
      {
        icon: Activity,
        label: "Active users",
        value: formatNumber(pickRange(metrics.overviewKpis.activeUsers, range)),
        detail: "Users who generated summaries",
      },
      {
        icon: Sparkles,
        label: "Summaries",
        value: formatNumber(pickRange(metrics.overviewKpis.summaries, range)),
        detail: "Completed summary runs",
      },
      {
        icon: DollarSign,
        label: "OpenAI spend",
        value: formatCurrency(
          range === "today"
            ? metrics.overviewKpis.openAi.todayUsd
            : range === "7d"
              ? metrics.overviewKpis.openAi.last7DaysUsd
              : metrics.overviewKpis.openAi.last30DaysUsd,
          "USD",
          2
        ),
        detail: `${formatNumber(
          range === "today"
            ? metrics.overviewKpis.openAi.todayRequests
            : range === "7d"
              ? metrics.overviewKpis.openAi.last7DaysRequests
              : metrics.overviewKpis.openAi.last30DaysRequests
        )} requests`,
      },
      {
        icon: DollarSign,
        label: "Revenue MTD",
        value: formatCurrency(metrics.overviewKpis.revenueMtdUsd, "USD", 2),
        detail: "Estimated recognized revenue",
      },
      {
        icon: Webhook,
        label: "Failed webhooks",
        value: formatNumber(metrics.overviewKpis.failedWebhooks7Days),
        detail: "Last 7 days",
      },
      {
        icon: LifeBuoy,
        label: "Support new",
        value: formatNumber(metrics.overviewKpis.supportNew),
        detail: "Waiting for first admin response",
      },
      {
        icon: MessageSquareHeart,
        label: "Feedback new",
        value: formatNumber(metrics.overviewKpis.feedbackNew),
        detail: "Untriaged feedback items",
      },
    ],
    [metrics, range, rangeLabel]
  );

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
        title="Overview"
        description={`Health, growth, revenue, usage risk, and issues at a glance. Last updated ${formatDate(metrics.generatedAt, "en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            {(["today", "7d", "30d"] as const).map((option) => (
              <Button key={option} type="button" variant={range === option ? "default" : "outline"} size="sm" onClick={() => setRange(option)}>
                {option === "today" ? "Today" : option}
              </Button>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => startTransition(() => void refreshMetrics())} disabled={refreshing}>
              <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard key={item.label} icon={item.icon} label={item.label} value={item.value} detail={item.detail} />
        ))}
      </div>

      <Card className="bg-[var(--surface-elevated)]">
        <CardHeader className="space-y-2">
          <h2 className="text-xl font-semibold text-[var(--text-strong)]">Needs attention</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Operational items that deserve a manual check.</p>
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
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">Summary volume</h2>
            <p className="text-sm text-[var(--muted-foreground)]">30-day trend for generated summaries.</p>
          </CardHeader>
          <CardContent>
            <AdminLineChart points={metrics.health.summaryTrend30Days} color="#247052" />
          </CardContent>
        </Card>

        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">OpenAI cost risk</h2>
            <p className="text-sm text-[var(--muted-foreground)]">30-day spend trend with no client-side secret exposure.</p>
          </CardHeader>
          <CardContent>
            <AdminLineChart points={metrics.health.aiSpendTrend30Days} color="#d4a373" />
          </CardContent>
        </Card>

        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">Recent failures</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Sentry {metrics.health.sentryConfigured ? "configured" : "not configured"}.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.health.recentWebhookFailures.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No failed webhook deliveries logged in the last 7 days.</p>
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
              Open Sentry
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
