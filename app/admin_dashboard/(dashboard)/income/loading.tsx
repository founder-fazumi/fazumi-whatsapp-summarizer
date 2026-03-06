import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminIncomeLoading() {
  return (
    <AdminShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="h-4 w-28 animate-pulse rounded bg-[var(--surface-muted)]" />
            <div className="h-8 w-48 animate-pulse rounded bg-[var(--surface-muted)]" />
          </div>
          <div className="h-10 w-40 animate-pulse rounded bg-[var(--surface-muted)]" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="bg-[var(--surface-elevated)]">
              <CardContent className="space-y-3 p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-[var(--surface-muted)]" />
                <div className="h-8 w-28 animate-pulse rounded bg-[var(--surface-muted)]" />
                <div className="h-4 w-20 animate-pulse rounded bg-[var(--surface-muted)]" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-[var(--surface-elevated)]">
          <CardContent className="space-y-4 p-5">
            <div className="h-4 w-40 animate-pulse rounded bg-[var(--surface-muted)]" />
            <div className="h-52 animate-pulse rounded-[var(--radius)] bg-[var(--surface-muted)]" />
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="bg-[var(--surface-elevated)]">
              <CardContent className="space-y-3 p-5">
                <div className="h-4 w-32 animate-pulse rounded bg-[var(--surface-muted)]" />
                <div className="h-11 w-full animate-pulse rounded bg-[var(--surface-muted)]" />
                <div className="h-11 w-full animate-pulse rounded bg-[var(--surface-muted)]" />
                <div className="h-11 w-32 animate-pulse rounded bg-[var(--surface-muted)]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
