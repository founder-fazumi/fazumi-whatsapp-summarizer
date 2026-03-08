import { DashboardShell } from "@/components/layout/DashboardShell";
import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <DashboardShell contentClassName="max-w-6xl">
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>

        <div className="surface-panel bg-[var(--surface-elevated)] p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-[var(--shadow-card)]">
          <Skeleton className="mb-4 hidden h-4 w-full md:block" />
          <SkeletonTable rows={6} />
        </div>
      </div>
    </DashboardShell>
  );
}
