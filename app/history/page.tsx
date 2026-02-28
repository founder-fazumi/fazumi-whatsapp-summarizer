import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";
import { HistoryList } from "@/components/history/HistoryList";
import Link from "next/link";
import { Sparkles } from "lucide-react";

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
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <span className="text-5xl select-none">📭</span>
          <p className="text-base font-semibold text-[var(--foreground)]">No summaries yet</p>
          <p className="text-sm text-[var(--muted-foreground)] max-w-xs">
            Summaries you generate will be saved here automatically. Your raw chat text is never stored.
          </p>
          <Link
            href="/summarize"
            className="mt-2 inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Summarize your first chat
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <HistoryList summaries={summaries} />
    </DashboardShell>
  );
}
