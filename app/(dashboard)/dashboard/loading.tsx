import { DashboardShell } from "@/components/layout/DashboardShell";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <DashboardShell>
      <div className="space-y-5">
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-card)]">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
          <Skeleton className="mt-4 h-2 w-full rounded-full" />
          <div className="mt-5 flex gap-3">
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </DashboardShell>
  );
}
