import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { History } from "lucide-react";

export default function HistoryPage() {
  return (
    <DashboardShell>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
              <History className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <CardTitle>Summary History</CardTitle>
              <CardDescription>Your saved summaries will appear here</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <span className="text-4xl">📭</span>
            <p className="text-sm font-medium text-[var(--foreground)]">No summaries yet</p>
            <p className="text-xs text-[var(--muted-foreground)] max-w-xs">
              Summaries you generate will be saved here automatically — once you&apos;re logged in. Your raw chat text is never stored.
            </p>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
