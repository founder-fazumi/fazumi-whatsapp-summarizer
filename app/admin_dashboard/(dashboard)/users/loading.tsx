import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminUsersLoading() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-[var(--surface-muted)]" />
          <div className="h-8 w-40 animate-pulse rounded bg-[var(--surface-muted)]" />
          <div className="h-4 w-72 animate-pulse rounded bg-[var(--surface-muted)]" />
        </div>

        <Card className="bg-[var(--surface-elevated)]">
          <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_12rem_8rem]">
            <div className="h-11 animate-pulse rounded bg-[var(--surface-muted)]" />
            <div className="h-11 animate-pulse rounded bg-[var(--surface-muted)]" />
            <div className="h-11 animate-pulse rounded bg-[var(--surface-muted)]" />
          </CardContent>
        </Card>

        <Card className="bg-[var(--surface-elevated)]">
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] p-4 md:grid-cols-[3rem_minmax(0,2fr)_1fr_1fr_1fr_1fr]"
              >
                {Array.from({ length: 6 }).map((__, cellIndex) => (
                  <div
                    key={cellIndex}
                    className="h-5 animate-pulse rounded bg-[var(--surface)]"
                  />
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
