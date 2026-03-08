import { DashboardShell } from "@/components/layout/DashboardShell";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <DashboardShell contentClassName="max-w-6xl">
      <div className="space-y-4">
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-[var(--radius-lg)]" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-52" />
            </div>
          </div>
          <div className="mt-6 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-40" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
