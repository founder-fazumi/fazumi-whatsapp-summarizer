import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="page-shell flex h-16 items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      <main className="page-section">
        <div className="page-shell space-y-10">
          <div className="mx-auto max-w-3xl text-center">
            <Skeleton className="mx-auto h-4 w-20" />
            <Skeleton className="mx-auto mt-4 h-8 w-56" />
            <Skeleton className="mx-auto mt-3 h-4 w-80 max-w-full" />
            <Skeleton className="mx-auto mt-6 h-10 w-40 rounded-full" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </main>
    </div>
  );
}
