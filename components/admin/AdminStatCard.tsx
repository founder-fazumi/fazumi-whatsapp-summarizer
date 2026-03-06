"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { AdminMetricStatus } from "@/lib/admin/types";
import { getStatusLabel } from "@/lib/admin/presentation";

interface AdminStatCardProps {
  title: string;
  value: string;
  description?: string;
  children?: React.ReactNode;
  trend?: number | null;
  trendLabel?: string;
  inverseTrend?: boolean;
  status?: AdminMetricStatus;
  statusLabel?: string;
  progress?: number;
  detailTitle?: string;
  detailContent?: React.ReactNode;
  className?: string;
  highlight?: boolean;
}

function getStatusClasses(status: AdminMetricStatus) {
  switch (status) {
    case "good":
      return "status-success";
    case "warning":
      return "status-warning";
    case "critical":
      return "status-destructive";
    default:
      return "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted-foreground)]";
  }
}

export function AdminStatCard({
  title,
  value,
  description,
  children,
  trend,
  trendLabel,
  inverseTrend = false,
  status = "neutral",
  statusLabel,
  progress,
  detailTitle,
  detailContent,
  className,
  highlight = false,
}: AdminStatCardProps) {
  const [open, setOpen] = useState(false);
  const interactive = Boolean(detailContent);
  const hasTrend = typeof trend === "number";
  const trendDirection =
    !hasTrend || Math.abs(trend) < 0.05 ? "flat" : trend > 0 ? "up" : "down";
  const trendPositive =
    trendDirection === "flat"
      ? false
      : inverseTrend
        ? (trend ?? 0) < 0
        : (trend ?? 0) > 0;
  const TrendIcon =
    trendDirection === "up"
      ? ArrowUpRight
      : trendDirection === "down"
        ? ArrowDownRight
        : Minus;
  const trendToneClass =
    trendDirection === "flat"
      ? "text-[var(--muted-foreground)]"
      : trendPositive
        ? "text-[var(--success)]"
        : "text-[var(--destructive)]";

  const content = (
    <>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            {title}
          </CardTitle>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
              getStatusClasses(status)
            )}
          >
            {statusLabel ?? getStatusLabel(status)}
          </span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
            {value}
          </div>

          {hasTrend ? (
            <div className={cn("inline-flex items-center gap-1.5 text-xs font-medium", trendToneClass)}>
              <TrendIcon className="h-4 w-4" />
              <span>
                {formatNumber(Math.abs(trend ?? 0), {
                  maximumFractionDigits: 1,
                })}
                % {trendLabel ?? "vs previous period"}
              </span>
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {description ? (
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
        ) : null}

        {typeof progress === "number" ? (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-xs text-[var(--muted-foreground)]">
              {formatNumber(progress, { maximumFractionDigits: 1 })}% capacity used
            </p>
          </div>
        ) : null}

        {children}

        {interactive ? (
          <div className="flex items-center justify-between rounded-[var(--radius)] border border-dashed border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted-foreground)]">
            <span>View details</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        ) : null}
      </CardContent>
    </>
  );

  return (
    <>
      <Card
        className={cn(
          "h-full border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]",
          interactive &&
            "transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]",
          highlight &&
            "border-transparent bg-[linear-gradient(160deg,rgba(36,112,82,0.11),rgba(255,253,249,0.96)_55%,rgba(229,161,92,0.12))]",
          className
        )}
      >
        {interactive ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-full w-full text-left"
            aria-haspopup="dialog"
            aria-label={`Open ${title} details`}
          >
            {content}
          </button>
        ) : (
          content
        )}
      </Card>

      {detailContent ? (
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title={detailTitle ?? title}
          className="max-w-2xl"
        >
          {detailContent}
        </Dialog>
      ) : null}
    </>
  );
}
