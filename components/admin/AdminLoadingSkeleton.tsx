"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/Skeleton";

export function AdminLoadingSkeleton({ cards = 5 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: cards }).map((_, index) => (
          <Card key={index} className="bg-[var(--surface-elevated)]">
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-[var(--surface-elevated)]">
        <CardContent className="space-y-4 p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-64 rounded-[var(--radius)]" />
        </CardContent>
      </Card>
    </div>
  );
}
