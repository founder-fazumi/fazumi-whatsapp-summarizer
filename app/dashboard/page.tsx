import { DashboardShell } from "@/components/layout/DashboardShell";
import { DashboardBanner } from "@/components/dashboard/DashboardBanner";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { TodoWidget } from "@/components/widgets/TodoWidget";
import { ReferralCard } from "@/components/widgets/ReferralCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UsageDaily } from "@/lib/supabase/types";

const RIGHT_COLUMN = (
  <>
    <CalendarWidget />
    <TodoWidget />
    <ReferralCard />
  </>
);

export default async function DashboardPage() {
  // Fetch session + profile + today's usage server-side
  let userName: string | null = null;
  let plan = "free";
  let trialExpiresAt: string | null = null;
  let summariesUsed = 0;
  const summariesLimit = 50;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      userName = (user.user_metadata?.full_name as string | null) ?? user.email?.split("@")[0] ?? null;

      const today = new Date().toISOString().slice(0, 10);
      const [{ data: profile }, { data: usage }] = await Promise.all([
        supabase
          .from("profiles")
          .select("plan, trial_expires_at")
          .eq("id", user.id)
          .single<Pick<Profile, "plan" | "trial_expires_at">>(),
        supabase
          .from("usage_daily")
          .select("summaries_used")
          .eq("user_id", user.id)
          .eq("date", today)
          .single<Pick<UsageDaily, "summaries_used">>(),
      ]);

      plan = profile?.plan ?? "free";
      trialExpiresAt = profile?.trial_expires_at ?? null;
      summariesUsed = usage?.summaries_used ?? 0;
    }
  } catch {
    // Supabase not configured — show dashboard with default values
  }

  return (
    <DashboardShell rightColumn={RIGHT_COLUMN}>
      <DashboardBanner
        userName={userName}
        plan={plan}
        trialExpiresAt={trialExpiresAt}
        summariesUsed={summariesUsed}
        summariesLimit={summariesLimit}
      />

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
