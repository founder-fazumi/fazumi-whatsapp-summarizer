import type { AdminChartPoint } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

interface AdminBarChartProps {
  points: AdminChartPoint[];
}

export function AdminBarChart({ points }: AdminBarChartProps) {
  const maxCount = Math.max(...points.map((point) => point.count), 1);

  return (
    <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex h-44 items-end gap-2">
        {points.map((point) => {
          const height = `${Math.max((point.count / maxCount) * 100, point.count > 0 ? 12 : 4)}%`;

          return (
            <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="text-xs font-medium text-[var(--muted-foreground)]">
                {point.count}
              </div>
              <div className="flex h-32 w-full items-end rounded-full bg-[var(--surface-muted)] px-1.5 pb-1.5">
                <div
                  className={cn(
                    "w-full rounded-full bg-[var(--primary)] shadow-[var(--shadow-xs)]",
                    point.count === 0 ? "bg-[var(--border-strong)]" : ""
                  )}
                  style={{ height }}
                />
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)]">{point.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
