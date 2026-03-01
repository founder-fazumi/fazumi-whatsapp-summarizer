import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { HistoryList } from "@/components/history/HistoryList";
import { EmptyState } from "@/components/shared/EmptyState";
import { Inbox, Sparkles } from "lucide-react";

export interface SummaryRow {
  id: string;
  title: string;
  tldr: string;
  created_at: string;
  char_count: number;
  lang_detected: string;
}

export default async function HistoryPage() {
  let summaries: SummaryRow[] = [];

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("summaries")
        .select("id, title, tldr, created_at, char_count, lang_detected")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100);

      summaries = (data as SummaryRow[] | null) ?? [];
    }
  } catch {
    // Supabase not configured
  }

  if (summaries.length === 0) {
    return (
      <DashboardShell>
        <EmptyState
          icon={Inbox}
          title={<LocalizedText en="No summaries yet" ar="لا توجد ملخصات بعد" />}
          body={
            <LocalizedText
              en="Summaries you generate will be saved here automatically. Your raw chat text is never stored."
              ar="سيتم حفظ الملخصات التي تنشئها هنا تلقائيًا. لا يتم حفظ نص المحادثة الخام أبدًا."
            />
          }
          cta={{
            label: <LocalizedText en="Summarize your first chat" ar="لخّص أول محادثة لك" />,
            href: "/summarize",
            icon: Sparkles,
          }}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <HistoryList summaries={summaries} />
    </DashboardShell>
  );
}
