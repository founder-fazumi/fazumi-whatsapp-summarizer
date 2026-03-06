import { useId } from "react";
import type { AdminChartPoint } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

function buildLinePath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export function AdminLineChart({
  points,
  color = "#247052",
  className,
}: {
  points: AdminChartPoint[];
  color?: string;
  className?: string;
}) {
  const gradientId = useId();
  const width = 320;
  const height = 120;
  const padding = 12;
  const maxValue = Math.max(...points.map((point) => point.count), 1);
  const normalizedPoints =
    points.length <= 1
      ? [
          { x: padding, y: height - padding },
          { x: width - padding, y: height - padding },
        ]
      : points.map((point, index) => {
          const x =
            padding + (index / Math.max(points.length - 1, 1)) * (width - (padding * 2));
          const y =
            height - padding - ((point.count / maxValue) * (height - (padding * 2)));

          return { x, y };
        });
  const linePath = buildLinePath(normalizedPoints);
  const areaPath = `${linePath} L ${normalizedPoints[normalizedPoints.length - 1]?.x ?? width - padding} ${height - padding} L ${normalizedPoints[0]?.x ?? padding} ${height - padding} Z`;

  return (
    <div className={cn("rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        role="img"
        aria-label="Trend line chart"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="var(--border)"
          strokeWidth="1"
        />

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {normalizedPoints.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            cx={point.x}
            cy={point.y}
            r="3.5"
            fill={color}
            stroke="var(--surface)"
            strokeWidth="2"
          />
        ))}
      </svg>

      {points.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[var(--muted-foreground)] sm:grid-cols-4">
          {points.slice(-4).map((point) => (
            <div key={point.date} className="rounded-[var(--radius)] bg-[var(--surface-muted)] px-2 py-1.5">
              <div>{point.label}</div>
              <div className="font-medium text-[var(--text-strong)]">{point.count}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
