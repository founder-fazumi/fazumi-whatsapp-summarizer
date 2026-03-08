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
import { toImportantDateArray, parseChatType, parseChatContext } from "@/lib/ai/summarize";
import { resolveEntitlement, type EntitlementSubscription } from "@/lib/limits";
import { formatDate, formatNumber } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SummaryDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: row }, { data: profile }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("summaries")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single<{
        id: string;
        title: string;
        tldr: string;
        important_dates: unknown;
        action_items: string[];
        urgent_action_items: unknown;
        people_classes: string[];
        contacts: unknown;
        links: string[];
        questions: string[];
        chat_type: string | null;
        chat_context: unknown;
        char_count: number;
        group_name: string | null;
        lang_detected: string;
        created_at: string;
        source_kind: "text" | "zip";
        source_range: "24h" | "7d" | null;
        new_messages_count: number | null;
      }>(),
    supabase
      .from("profiles")
      .select("plan, trial_expires_at")
      .eq("id", user.id)
      .maybeSingle<{ plan: string | null; trial_expires_at: string | null }>(),
    supabase
      .from("subscriptions")
      .select("plan_type, status, current_period_end, updated_at, created_at")
      .eq("user_id", user.id),
  ]);

  if (!row) notFound();

  const summary: SummaryResult = {
    tldr: row.tldr,
    important_dates: toImportantDateArray(row.important_dates),
    action_items: row.action_items ?? [],
    urgent_action_items: Array.isArray(row.urgent_action_items)
      ? (row.urgent_action_items as string[])
      : [],
    people_classes: row.people_classes ?? [],
    contacts: Array.isArray(row.contacts) ? (row.contacts as string[]) : [],
    links: row.links ?? [],
    questions: row.questions ?? [],
    chat_type: parseChatType(row.chat_type),
    chat_context: parseChatContext(row.chat_context),
    lang_detected: row.lang_detected,
    char_count: row.char_count,
  };

  const entitlement = resolveEntitlement({
    profile: {
      plan: profile?.plan ?? "free",
      trial_expires_at: profile?.trial_expires_at ?? null,
    },
    subscriptions: (subscriptions ?? []) as EntitlementSubscription[],
  });

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
  const actionMode = entitlement.hasPaidAccess ? "active" : "gated";

  return (
    <DashboardShell>
      <Card className="mb-4 bg-[var(--surface-elevated)]">
        <CardHeader className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/history"
                className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
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
              {row.source_kind === "zip" && (
                <span className="rounded-full border border-[var(--border)] px-2 py-px text-xs font-medium text-[var(--primary)]">
                  <LocalizedText
                    en={
                      row.source_range === "24h"
                        ? "ZIP • 24h"
                        : row.source_range === "7d"
                          ? "ZIP • 7d"
                          : "ZIP"
                    }
                    ar={
                      row.source_range === "24h"
                        ? "ZIP • 24 ساعة"
                        : row.source_range === "7d"
                          ? "ZIP • 7 أيام"
                          : "ZIP"
                    }
                  />
                </span>
              )}
              {row.source_kind === "zip" && typeof row.new_messages_count === "number" && (
                <span className="rounded-full border border-[var(--border)] px-2 py-px text-xs font-medium text-[var(--muted-foreground)]">
                  <LocalizedText
                    en={`${formatNumber(row.new_messages_count)} new messages`}
                    ar={`${formatNumber(row.new_messages_count)} رسالة جديدة`}
                  />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/summarize"
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--primary)] shadow-[var(--shadow-xs)] hover:bg-[var(--surface-muted)]"
              >
                <LocalizedText en="Summarize again →" ar="لخّص مرة أخرى ←" />
              </Link>
              <DeleteSummaryButton summaryId={id} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-4 pb-3 pt-0">
          <h1 className="text-[var(--text-lg)] font-semibold leading-snug text-[var(--foreground)] sm:text-[var(--text-xl)]">
            {row.title}
          </h1>
          {row.group_name && (
            <span className="inline-flex items-center rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
              {row.group_name}
            </span>
          )}
        </CardContent>
      </Card>

      <SummaryDisplay summary={summary} outputLang={outputLang} actionMode={actionMode} />
    </DashboardShell>
  );
}
