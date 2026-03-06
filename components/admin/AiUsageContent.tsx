"use client";

import { startTransition, useState } from "react";
import { AlertTriangle, Bot, RefreshCcw } from "lucide-react";
import type { AdminAiUsageData } from "@/lib/admin/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { AdminBarChart } from "@/components/admin/AdminBarChart";
import { AdminLineChart } from "@/components/admin/AdminLineChart";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

async function fetchAiUsage() {
  const response = await fetch("/api/admin/ai-usage", {
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    ok: boolean;
    data?: AdminAiUsageData;
    error?: string;
  };

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Could not load AI usage.");
  }

  return payload.data;
}

function toneClass(status: "good" | "warning" | "critical" | "neutral") {
  if (status === "good") {
    return "text-[var(--success)]";
  }

  if (status === "warning") {
    return "text-[var(--warning)]";
  }

  if (status === "neutral") {
    return "text-[var(--muted-foreground)]";
  }

  return "text-[var(--destructive)]";
}

function AlertTile({
  label,
  value,
  threshold,
  status,
}: {
  label: string;
  value: string;
  threshold: string;
  status: "good" | "warning" | "critical";
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
        <span className={`text-xs font-semibold uppercase tracking-wide ${toneClass(status)}`}>
          {status}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{value}</div>
      <div className="mt-1 text-xs text-[var(--muted-foreground)]">Target {threshold}</div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="text-sm text-[var(--muted-foreground)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{value}</div>
      <div className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</div>
    </div>
  );
}

export function AiUsageContent({
  initialData,
}: {
  initialData: AdminAiUsageData;
}) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleRefresh() {
    startTransition(() => {
      void (async () => {
        setRefreshing(true);
        setError(null);

        try {
          setData(await fetchAiUsage());
        } catch (refreshError) {
          setError(
            refreshError instanceof Error
              ? refreshError.message
              : "Could not refresh AI usage."
          );
        } finally {
          setRefreshing(false);
        }
      })();
    });
  }

  const todaySpend = data.spendTrend.at(-1)?.count ?? 0;
  const averageDailySpend =
    data.spendTrend.reduce((sum, point) => sum + point.count, 0) /
    Math.max(data.spendTrend.length, 1);
  const projectedMonthly = averageDailySpend * 30;
  const tokensByModel = Object.entries(
    data.recentEvents.reduce<Record<string, number>>((accumulator, event) => {
      accumulator[event.model] = (accumulator[event.model] ?? 0) + event.totalTokens;
      return accumulator;
    }, {})
  ).map(([model, totalTokens]) => ({
    date: model,
    label: model,
    count: totalTokens,
  }));
  const recentErrors = data.recentEvents
    .filter((event) => event.status === "error")
    .slice(0, 8);
  const rateLimitUsage =
    data.rateLimit.recommendedRequestsPerMinute > 0
      ? (data.rateLimit.peakRequestsPerMinute / data.rateLimit.recommendedRequestsPerMinute) * 100
      : 0;
  const costRisk = Math.min((projectedMonthly / 100) * 100, 100);
  const errorRisk = Math.min((data.totals.errorRate / 5) * 100, 100);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="AI Usage Monitor"
        description="Actionable AI operations dashboard: cost alerts first, then throughput, model mix, recent errors, and rate-limit pressure."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        }
      />

      {error ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--destructive)]/30 bg-[var(--destructive-soft)] px-4 py-3 text-sm text-[var(--destructive-foreground)]">
          {error}
        </div>
      ) : null}

      <Card className="border-l-4 border-l-[var(--destructive)] bg-[var(--surface-elevated)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-[var(--destructive)]">
            <AlertTriangle className="h-5 w-5" />
            Cost alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <AlertTile
            label="Today's spend"
            value={formatCurrency(todaySpend, "USD", 2)}
            threshold="$10.00 / day"
            status={todaySpend < 10 ? "good" : todaySpend < 15 ? "warning" : "critical"}
          />
          <AlertTile
            label="Average cost / request"
            value={formatCurrency(data.totals.avgCostPerRequest, "USD", 4)}
            threshold="$0.0050"
            status={
              data.totals.avgCostPerRequest < 0.005
                ? "good"
                : data.totals.avgCostPerRequest < 0.01
                  ? "warning"
                  : "critical"
            }
          />
          <AlertTile
            label="Projected monthly"
            value={formatCurrency(projectedMonthly, "USD", 2)}
            threshold="$100.00 / month"
            status={projectedMonthly < 100 ? "good" : projectedMonthly < 150 ? "warning" : "critical"}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Model" value={data.model} hint="Current summarization model" />
        <MetricTile
          label="Requests 24h"
          value={formatNumber(data.totals.requests24Hours)}
          hint={`${formatNumber(data.totals.requests7Days)} in the last 7 days`}
        />
        <MetricTile
          label="Tokens 7d"
          value={formatNumber(data.totals.totalTokens7Days)}
          hint={`${formatNumber(data.totals.avgTokensPerRequest, { maximumFractionDigits: 0 })} average per request`}
        />
        <MetricTile
          label="Average latency"
          value={`${formatNumber(data.totals.avgLatencyMs)} ms`}
          hint={`${formatNumber(data.totals.successRate, { maximumFractionDigits: 1 })}% success rate`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <CardTitle className="text-lg">Spend trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminLineChart points={data.spendTrend} color="#247052" />
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <CardTitle className="text-lg">Token trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminLineChart points={data.tokenTrend} color="#e5a15c" />
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <CardTitle className="text-lg">Tokens by model</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminBarChart
              points={
                tokensByModel.length > 0
                  ? tokensByModel
                  : [{ date: data.model, label: data.model, count: 0 }]
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <CardTitle className="text-lg">Cost and quality breakdown</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <MetricTile
              label="Total cost 7d"
              value={formatCurrency(data.totals.totalCost7Days, "USD", 2)}
              hint="Estimated OpenAI usage"
            />
            <MetricTile
              label="Error rate"
              value={`${formatNumber(data.totals.errorRate, { maximumFractionDigits: 1 })}%`}
              hint={`${formatNumber(data.errorBreakdown.length)} error codes seen`}
            />
            <MetricTile
              label="Average tokens / request"
              value={formatNumber(data.totals.avgTokensPerRequest, { maximumFractionDigits: 0 })}
              hint="Prompt plus completion"
            />
            <MetricTile
              label="Average cost / request"
              value={formatCurrency(data.totals.avgCostPerRequest, "USD", 4)}
              hint={`${formatNumber(data.totals.requests7Days)} requests in 7 days`}
            />
          </CardContent>
        </Card>

        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-[var(--primary)]" />
              Rate limit posture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">Peak requests / minute</span>
                <span className="font-medium text-[var(--text-strong)]">
                  {formatNumber(data.rateLimit.peakRequestsPerMinute)} / {formatNumber(data.rateLimit.recommendedRequestsPerMinute)}
                </span>
              </div>
              <Progress value={Math.min(rateLimitUsage, 100)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">Projected monthly cost risk</span>
                <span className="font-medium text-[var(--text-strong)]">
                  {formatCurrency(projectedMonthly, "USD", 2)}
                </span>
              </div>
              <Progress value={costRisk} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">Error-rate pressure</span>
                <span className="font-medium text-[var(--text-strong)]">
                  {formatNumber(data.totals.errorRate, { maximumFractionDigits: 1 })}%
                </span>
              </div>
              <Progress value={errorRisk} />
            </div>
            <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted-foreground)]">Status</span>
                <span className={`font-medium uppercase ${toneClass(data.rateLimit.status)}`}>
                  {data.rateLimit.status}
                </span>
              </div>
              <div className="mt-2 text-[var(--muted-foreground)]">
                Headroom remaining: {formatNumber(data.rateLimit.headroom)} requests per minute.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[var(--surface-elevated)]">
        <CardHeader>
          <CardTitle className="text-lg">Recent API errors</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-medium text-start">Timestamp</th>
                <th className="px-4 py-3 font-medium text-start">Error</th>
                <th className="px-4 py-3 font-medium text-start">Model</th>
                <th className="px-4 py-3 font-medium text-start">Tokens</th>
                <th className="px-4 py-3 font-medium text-start">Cost</th>
              </tr>
            </thead>
            <tbody>
              {recentErrors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[var(--muted-foreground)]">
                    No API errors in recent events.
                  </td>
                </tr>
              ) : (
                recentErrors.map((event) => (
                  <tr key={event.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-4 text-[var(--muted-foreground)]">
                      {formatDate(event.createdAt, "en", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-4 text-[var(--destructive)]">
                      {event.errorCode ?? "Unknown error"}
                    </td>
                    <td className="px-4 py-4 text-[var(--text-strong)]">{event.model}</td>
                    <td className="px-4 py-4 text-[var(--muted-foreground)]">
                      {formatNumber(event.totalTokens)}
                    </td>
                    <td className="px-4 py-4 text-[var(--muted-foreground)]">
                      {formatCurrency(event.estimatedCostUsd, "USD", 4)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
