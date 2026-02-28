import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { SummaryDisplay } from "@/components/SummaryDisplay";
import { DeleteSummaryButton } from "@/components/history/DeleteSummaryButton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Clock, FileText } from "lucide-react";
import type { SummaryResult } from "@/lib/ai/summarize";
import { formatDate, formatNumber } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SummaryDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("summaries")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single<{
      id: string;
      title: string;
      tldr: string;
      important_dates: string[];
      action_items: string[];
      people_classes: string[];
      links: string[];
      questions: string[];
      char_count: number;
      lang_detected: string;
      created_at: string;
    }>();

  if (!row) notFound();

  const summary: SummaryResult = {
    tldr: row.tldr,
    important_dates: row.important_dates ?? [],
    action_items: row.action_items ?? [],
    people_classes: row.people_classes ?? [],
    links: row.links ?? [],
    questions: row.questions ?? [],
    lang_detected: row.lang_detected,
    char_count: row.char_count,
  };

  const outputLang: "en" | "ar" = row.lang_detected === "ar" ? "ar" : "en";
  const dateEn = formatDate(row.created_at, "en", {
    year: "numeric", month: "short", day: "numeric",
  });
  const dateAr = formatDate(row.created_at, "ar", {
    year: "numeric", month: "short", day: "numeric",
  });
  const charCount = `${formatNumber(row.char_count / 1000, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}k`;

  return (
    <DashboardShell>
      {/* Back + meta bar */}
      <Card className="mb-4">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Link
                href="/history"
                className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <LocalizedText en="History" ar="السجل" />
              </Link>
              <span className="text-[var(--border)]">·</span>
              <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                <Clock className="h-3.5 w-3.5" />
                <LocalizedText en={dateEn} ar={dateAr} />
              </div>
              <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                <FileText className="h-3.5 w-3.5" />
                <LocalizedText en={`${charCount} chars`} ar={`${charCount} أحرف`} />
              </div>
              <span className="rounded-full border border-[var(--border)] px-2 py-px text-xs font-medium text-[var(--muted-foreground)]">
                {row.lang_detected.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/summarize"
                className="text-xs text-[var(--primary)] hover:underline"
              >
                <LocalizedText en="Summarize again →" ar="لخّص مرة أخرى ←" />
              </Link>
              <DeleteSummaryButton summaryId={id} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          <p className="text-sm font-semibold text-[var(--foreground)]">{row.title}</p>
        </CardContent>
      </Card>

      <SummaryDisplay summary={summary} outputLang={outputLang} />
    </DashboardShell>
  );
}
