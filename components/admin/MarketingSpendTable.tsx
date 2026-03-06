"use client";

import type { AdminMarketingSpendRecord } from "@/lib/admin/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function MarketingSpendTable({
  entries,
}: {
  entries: AdminMarketingSpendRecord[];
}) {
  return (
    <Card className="h-full bg-[var(--surface-elevated)]">
      <CardHeader>
        <CardTitle>Spend history</CardTitle>
        <CardDescription>
          Recent rows used for CAC and channel reporting.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-[var(--muted-foreground)]"
                  >
                    No marketing spend yet. Add your first row to turn CAC into a live admin metric.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-[var(--border)] align-top">
                    <td className="px-4 py-4 text-[var(--muted-foreground)]">
                      <div className="font-medium text-[var(--text-strong)]">
                        {formatDate(entry.month, "en", {
                          month: "short",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </div>
                      <div className="mt-1 text-xs">
                        Added{" "}
                        {formatDate(entry.createdAt, "en", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium capitalize text-[var(--text-strong)]">
                      {entry.channel.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-4 text-[var(--muted-foreground)]">
                      {formatCurrency(entry.amount, "USD", 2)}
                    </td>
                    <td className="px-4 py-4 text-[var(--muted-foreground)]">
                      {entry.notes?.trim() || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
