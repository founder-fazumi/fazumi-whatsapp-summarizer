"use client";

import { type ComponentType, startTransition, useState } from "react";
import { DollarSign, RefreshCcw, Star, TrendingUp, Users } from "lucide-react";
import type { AdminIncomeData } from "@/lib/admin/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { AdminBarChart } from "@/components/admin/AdminBarChart";
import { AdminLineChart } from "@/components/admin/AdminLineChart";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MarketingSpendForm } from "@/components/admin/MarketingSpendForm";
import { MarketingSpendTable } from "@/components/admin/MarketingSpendTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminIncomeContentProps {
  initialData: AdminIncomeData;
}

type IncomeCurrency = "USD" | "QAR";

async function fetchIncome() {
  const response = await fetch("/api/admin/income", {
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    ok: boolean;
    data?: AdminIncomeData;
    error?: string;
  };

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Could not load admin income.");
  }

  return payload.data;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  accentClass,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${accentClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-right text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
          {label}
        </div>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
        {value}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{detail}</p>
    </div>
  );
}

function InsightRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[var(--radius)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className="text-right font-medium text-[var(--text-strong)]">{value}</span>
    </div>
  );
}

export function AdminIncomeContent({ initialData }: AdminIncomeContentProps) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<IncomeCurrency>("USD");

  function formatMoney(value: number) {
    const amount = currency === "QAR" ? value * data.fx.qarPerUsd : value;
    return formatCurrency(amount, currency, 2);
  }

  async function refreshIncome() {
    setRefreshing(true);
    setError(null);

    try {
      setData(await fetchIncome());
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Could not refresh admin income."
      );
    } finally {
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    startTransition(() => {
      void refreshIncome();
    });
  }

  const totalPurchases = data.breakdown.reduce((sum, row) => sum + row.purchases, 0);
  const averageRevenuePerPurchase =
    totalPurchases > 0 ? data.cards.overall / totalPurchases : 0;
  const revenueMixPoints = data.breakdown.map((row) => ({
    date: row.planType,
    label: row.planType,
    count: row.estimatedRevenue,
  }));
  const revenueWindowPoints = [
    { date: "today", label: "Today", count: data.cards.today },
    { date: "7d", label: "7 days", count: data.cards.last7Days },
    { date: "30d", label: "30 days", count: data.cards.last30Days },
    { date: "all", label: "Overall", count: data.cards.overall },
  ];
  const spendTrendPoints =
    data.marketingSpend.entries.length > 0
      ? [...data.marketingSpend.entries]
          .sort((left, right) => left.month.localeCompare(right.month))
          .map((entry) => ({
            date: entry.month,
            label: formatDate(entry.month, "en", {
              month: "short",
              year: "2-digit",
              timeZone: "UTC",
            }),
            count: entry.amount,
          }))
      : [{ date: "current", label: "Current", count: data.marketingSpend.currentMonth }];
  const payoutDayLabel = formatDate(data.payout.nextPayoutAt, "en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const payoutCreatedLabel = formatDate(data.payout.batchCreatedAt, "en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const payoutArrivalLabel = `${formatDate(data.payout.bankArrivalStartAt, "en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })} to ${formatDate(data.payout.bankArrivalEndAt, "en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })}`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Income and CAC"
        description="Chinese dashboard pattern: dense revenue KPIs first, charts in the middle, then the spend table and next action cards."
        actions={
          <>
            <div className="inline-flex items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-elevated)] p-1">
              {(["USD", "QAR"] as const).map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={currency === option ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCurrency(option)}
                  className="min-w-14"
                >
                  {option}
                </Button>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </>
        }
      />

      {error ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--destructive)]/30 bg-[var(--destructive-soft)] px-4 py-3 text-sm text-[var(--destructive-foreground)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label="Total revenue"
          value={formatMoney(data.cards.overall)}
          detail={`${formatNumber(totalPurchases)} estimated purchases across all plans`}
          accentClass="bg-[var(--primary-soft)] text-[var(--primary)]"
        />
        <KpiCard
          icon={TrendingUp}
          label="30-day revenue"
          value={formatMoney(data.cards.last30Days)}
          detail={`${formatMoney(data.cards.last7Days)} in the last 7 days`}
          accentClass="bg-[color:rgba(229,161,92,0.18)] text-[color:#b66e31]"
        />
        <KpiCard
          icon={Users}
          label="Pro users"
          value={formatNumber(data.counts.proUsers)}
          detail={`${formatMoney(averageRevenuePerPurchase)} average revenue per purchase`}
          accentClass="bg-[var(--primary-soft)] text-[var(--primary)]"
        />
        <KpiCard
          icon={Star}
          label="Founder users"
          value={formatNumber(data.counts.founderUsers)}
          detail={`${formatMoney(data.payout.estimatedNet)} expected next payout`}
          accentClass="bg-[color:rgba(229,161,92,0.18)] text-[color:#b66e31]"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label="30-day CAC"
          value={formatMoney(data.cac.currentCac)}
          detail={`${formatNumber(data.cac.newCustomers)} new customers from ${formatMoney(data.cac.totalSpend)} spend`}
          accentClass="bg-[var(--primary-soft)] text-[var(--primary)]"
        />
        <KpiCard
          icon={DollarSign}
          label="Marketing spend"
          value={formatMoney(data.marketingSpend.totalLast30Days)}
          detail={`${formatMoney(data.marketingSpend.currentMonth)} entered for the current month`}
          accentClass="bg-[color:rgba(229,161,92,0.18)] text-[color:#b66e31]"
        />
        <KpiCard
          icon={Users}
          label="Threshold"
          value={formatMoney(data.payout.thresholdUsd)}
          detail={data.payout.thresholdMet ? "Threshold met for the next payout run" : "Below Lemon Squeezy minimum, likely rolls forward"}
          accentClass="bg-[var(--primary-soft)] text-[var(--primary)]"
        />
        <KpiCard
          icon={Star}
          label="Batch date"
          value={payoutDayLabel}
          detail={`Batch created ${payoutCreatedLabel}`}
          accentClass="bg-[color:rgba(229,161,92,0.18)] text-[color:#b66e31]"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <CardTitle className="text-lg">Revenue windows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-[var(--muted-foreground)]">
              A compact line view keeps today, short-term, and total revenue in one band.
            </div>
            <AdminLineChart points={revenueWindowPoints} color="#247052" />
          </CardContent>
        </Card>

        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <CardTitle className="text-lg">Revenue mix by plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-[var(--muted-foreground)]">
              Category comparison uses the Fazumi accent for plan revenue concentration.
            </div>
            <AdminBarChart points={revenueMixPoints} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <CardTitle className="text-lg">Marketing spend cadence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-[var(--muted-foreground)]">
              Spend entries become a quick line chart instead of hiding only in the table.
            </div>
            <AdminLineChart points={spendTrendPoints} color="#e5a15c" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[var(--primary)] bg-[var(--surface-elevated)]">
          <CardHeader>
            <CardTitle className="text-lg">Next payout action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InsightRow label="Next payout date" value={payoutDayLabel} />
            <InsightRow label="Batch creation" value={payoutCreatedLabel} />
            <InsightRow label="Bank arrival" value={payoutArrivalLabel} />
            <InsightRow label="Eligible purchases" value={formatNumber(data.payout.eligiblePurchases)} />
            <InsightRow label="Estimated gross" value={formatMoney(data.payout.estimatedGross)} />
            <InsightRow label="Estimated net" value={formatMoney(data.payout.estimatedNet)} />
            <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
              {data.estimated
                ? "Revenue values are estimated from plan prices and existing subscription rows."
                : "Revenue values come from the live subscription dataset."}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(0,0.92fr)]">
        <MarketingSpendTable entries={data.marketingSpend.entries} />
        <div className="space-y-4">
          <MarketingSpendForm onCreated={refreshIncome} />
          <Card className="bg-[var(--surface-elevated)]">
            <CardHeader>
              <CardTitle className="text-lg">Founder notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
              <p>
                Keep the form visible beside the history table so CAC corrections can be made without leaving the page.
              </p>
              <p>
                The income page now follows the card-plus-chart-plus-table sequence common in dense Chinese SaaS dashboards.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
