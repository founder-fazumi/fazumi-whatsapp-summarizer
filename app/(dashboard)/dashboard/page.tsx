import { DashboardShell } from "@/components/layout/DashboardShell";
import { DashboardBanner } from "@/components/dashboard/DashboardBanner";
import { FamilyCoordinationCard } from "@/components/dashboard/FamilyCoordinationCard";
import { FounderWelcomeModal } from "@/components/founder/FounderWelcomeModal";
import { MeasurementTracker } from "@/components/dashboard/MeasurementTracker";
import { PmfSurveyCard } from "@/components/dashboard/PmfSurveyCard";
import { UpgradingBanner } from "@/components/dashboard/UpgradingBanner";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { TodoWidget } from "@/components/widgets/TodoWidget";
import { ReferralCard } from "@/components/widgets/ReferralCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getDailyLimit, getTierKey } from "@/lib/limits";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UsageDaily } from "@/lib/supabase/types";

const RIGHT_COLUMN = (
  <>
    <CalendarWidget />
    <TodoWidget />
    <ReferralCard />
  </>
);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const { upgraded } = await searchParams;
  // Fetch session + profile + today's usage server-side
  let userName: string | null = null;
  let plan = "free";
  let trialExpiresAt: string | null = null;
  let summariesUsed = 0;
  let summaryCount = 0;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      userName = (user.user_metadata?.full_name as string | null) ?? user.email?.split("@")[0] ?? null;

      const today = new Date().toISOString().slice(0, 10);
      const [{ data: profile }, { data: usage }, { count }] = await Promise.all([
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
        supabase
          .from("summaries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("deleted_at", null),
      ]);

      plan = profile?.plan ?? "free";
      trialExpiresAt = profile?.trial_expires_at ?? null;
      summariesUsed = usage?.summaries_used ?? 0;
      summaryCount = count ?? 0;
    }
  } catch {
    // Supabase not configured — show dashboard with default values
  }

  const summariesLimit = getDailyLimit(getTierKey(plan, trialExpiresAt));

  return (
    <DashboardShell rightColumn={RIGHT_COLUMN}>
      <FounderWelcomeModal isFounder={plan === "founder"} />
      <MeasurementTracker />
      {upgraded === "1" && <UpgradingBanner />}
      <div className="space-y-5">
        <DashboardBanner
          userName={userName}
          plan={plan}
          trialExpiresAt={trialExpiresAt}
          summariesUsed={summariesUsed}
          summariesLimit={summariesLimit}
        />

        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-lg)]">
              <LocalizedText en="Paste or upload today’s school chat" ar="الصق أو ارفع محادثة المدرسة لليوم" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
              <LocalizedText
                en="Manual import is the fastest launch flow. Bring in WhatsApp, Telegram, or Facebook school chats and Fazumi turns them into one action-ready family dashboard with due today, upcoming dates, fees and forms, supplies, questions, and urgent items."
                ar="الاستيراد اليدوي هو أسرع مسار في الإطلاق. أحضر محادثات المدرسة من واتساب أو تيليجرام أو فيسبوك وسيحوّلها Fazumi إلى لوحة عائلية جاهزة للتنفيذ تشمل المطلوب اليوم والمواعيد القادمة والرسوم والنماذج والمستلزمات والأسئلة والعناصر العاجلة."
              />
            </p>
            <p className="mb-4 text-xs text-[var(--muted-foreground)]">
              <LocalizedText
                en="Morning digest, urgent alerts, reminders, calendar export, and the family action list all run from the same summary."
                ar="الملخص الصباحي والتنبيهات العاجلة والتذكيرات وتصدير التقويم وقائمة الإجراءات العائلية كلها تعمل انطلاقًا من الملخص نفسه."
              />
            </p>
            <Link
              href="/summarize"
              className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
            >
              <Sparkles className="h-4 w-4" />
              <LocalizedText en="Open import flow" ar="افتح مسار الاستيراد" />
            </Link>
          </CardContent>
        </Card>

        <FamilyCoordinationCard />
        <PmfSurveyCard summaryCount={summaryCount} />
      </div>
    </DashboardShell>
  );
}
