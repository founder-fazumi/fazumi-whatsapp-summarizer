import { DashboardShell } from "@/components/layout/DashboardShell";
import { DashboardBanner } from "@/components/dashboard/DashboardBanner";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { TodoWidget } from "@/components/widgets/TodoWidget";
import { ReferralCard } from "@/components/widgets/ReferralCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Sparkles } from "lucide-react";

const RIGHT_COLUMN = (
  <>
    <CalendarWidget />
    <TodoWidget />
    <ReferralCard />
  </>
);

export default function DashboardPage() {
  return (
    <DashboardShell rightColumn={RIGHT_COLUMN}>
      <DashboardBanner />

      {/* Quick action card */}
      <Card>
        <CardHeader>
          <CardTitle>Ready to summarize?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Paste your school group chat and get a structured summary in seconds — dates, tasks, and announcements extracted automatically.
          </p>
          <Link
            href="/summarize"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Go to Summarize
          </Link>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
