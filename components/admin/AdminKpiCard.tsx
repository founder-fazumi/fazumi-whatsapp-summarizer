"use client";

import { useId, type ComponentType } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface AdminKpiCardProps {
  label: string;
  value: string;
  sub?: string;
  delta?: { value: number; window: string };
  sparkData?: number[];
  icon?: ComponentType<{ className?: string }>;
  variant?: "default" | "warning" | "success";
}

const SVG_WIDTH = 80;
const SVG_HEIGHT = 32;
const SVG_PADDING = 4;

function getSparklinePoints(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const drawableHeight = SVG_HEIGHT - SVG_PADDING * 2;
  const baseline = SVG_HEIGHT - SVG_PADDING;
  const xPositions =
    values.length === 1
      ? [SVG_WIDTH / 2]
      : values.map((_, index) => SVG_PADDING + ((SVG_WIDTH - SVG_PADDING * 2) / (values.length - 1)) * index);

  const yFor = (value: number) => {
    if (min === max) {
      return SVG_HEIGHT / 2;
    }

    return baseline - ((value - min) / (max - min)) * drawableHeight;
  };

  const points = values.map((value, index) => `${xPositions[index]},${yFor(value)}`);
  const areaPoints = [
    `${xPositions[0]},${baseline}`,
    ...points,
    `${xPositions.at(-1) ?? xPositions[0]},${baseline}`,
  ].join(" ");

  return {
    areaPoints,
    points: points.join(" "),
  };
}

function getIconCircleClass(variant: NonNullable<AdminKpiCardProps["variant"]>) {
  if (variant === "warning") {
    return "bg-amber-500/10 text-amber-500";
  }

  if (variant === "success") {
    return "bg-green-500/10 text-green-500";
  }

  return "bg-[var(--primary-soft)] text-[var(--primary)]";
}

function getSparkClass(variant: NonNullable<AdminKpiCardProps["variant"]>) {
  if (variant === "warning") {
    return "text-[var(--warning)]";
  }

  if (variant === "success") {
    return "text-[#22c55e]";
  }

  return "text-[var(--primary)]";
}

function DeltaBadge({ delta }: { delta?: AdminKpiCardProps["delta"] }) {
  if (!delta) {
    return null;
  }

  const formattedValue = formatNumber(Math.abs(delta.value), {
    maximumFractionDigits: 1,
  });

  if (delta.value > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-soft)] px-1.5 py-0.5 text-xs text-[var(--success-foreground)]">
        <TrendingUp className="h-3 w-3" />
        <span>
          +{formattedValue}% {delta.window}
        </span>
      </span>
    );
  }

  if (delta.value < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--destructive-soft)] px-1.5 py-0.5 text-xs text-[var(--destructive-foreground)]">
        <TrendingDown className="h-3 w-3" />
        <span>
          -{formattedValue}% {delta.window}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-1.5 py-0.5 text-xs text-[var(--muted-foreground)]">
      — {delta.window}
    </span>
  );
}

export function AdminKpiCard({
  label,
  value,
  sub,
  delta,
  sparkData,
  icon: Icon,
  variant = "default",
}: AdminKpiCardProps) {
  const gradientId = useId().replace(/:/g, "");
  const sparkline = sparkData?.length ? getSparklinePoints(sparkData) : null;

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", getIconCircleClass(variant))}>
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
      </div>

      <div className="mt-4 min-w-0">
        <p className="text-2xl font-bold text-[var(--text-strong)]">{value}</p>
        {sub ? <p className="mt-1 text-xs text-[var(--muted-foreground)]">{sub}</p> : null}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <DeltaBadge delta={delta} />

        {sparkline ? (
          <svg
            className={cn("h-8 w-20 shrink-0", getSparkClass(variant))}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={sparkline.areaPoints} fill={`url(#${gradientId})`} />
            <polyline
              points={sparkline.points}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </div>
    </div>
  );
}
