import { DashboardShell } from "@/components/layout/DashboardShell";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <DashboardShell contentClassName="max-w-4xl">
      <div className="space-y-6">
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-card)]">
          <Skeleton className="mb-4 h-5 w-56" />
          <Skeleton className="h-[320px] w-full rounded-[var(--radius-xl)]" />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-12 w-full sm:w-36" />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
