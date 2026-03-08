import { Inbox, Sparkles } from "lucide-react";
import { FounderWelcomeModal } from "@/components/founder/FounderWelcomeModal";
import { HistoryList } from "@/components/history/HistoryList";
import type { SummaryRow } from "@/components/history/types";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { resolveEntitlement, type EntitlementSubscription } from "@/lib/limits";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;

function sanitizeSearch(value: string) {
  return value.trim().replace(/[,%]/g, " ");
}

function buildHistoryQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  query: string
) {
  let request = supabase
    .from("summaries")
    .select("id, title, tldr, created_at, char_count, lang_detected, source_kind, source_range, new_messages_count", { count: "exact" })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (query) {
    request = request.or(`title.ilike.%${query}%,tldr.ilike.%${query}%`);
  }

  return request.order("created_at", { ascending: false });
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const query = sanitizeSearch(params.q ?? "");
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  let currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  let summaries: SummaryRow[] = [];
  let totalCount = 0;
  let isFounder = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const [initialResponse, { data: profile }, { data: subscriptions }] = await Promise.all([
        buildHistoryQuery(supabase, user.id, query).range(from, to),
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
      let response = initialResponse;

      const entitlement = resolveEntitlement({
        profile: {
          plan: profile?.plan ?? "free",
          trial_expires_at: profile?.trial_expires_at ?? null,
        },
        subscriptions: (subscriptions ?? []) as EntitlementSubscription[],
      });

      isFounder = entitlement.billingPlan === "founder";

      totalCount = response.count ?? 0;

      const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
      if (totalCount > 0 && currentPage > totalPages) {
        currentPage = totalPages;
        const safeFrom = (currentPage - 1) * PAGE_SIZE;
        response = await buildHistoryQuery(supabase, user.id, query).range(
          safeFrom,
          safeFrom + PAGE_SIZE - 1
        );
        totalCount = response.count ?? totalCount;
      }

      summaries = (response.data as SummaryRow[] | null) ?? [];
    }
  } catch {
    // Supabase not configured
  }

  if (totalCount === 0 && !query) {
    return (
      <DashboardShell>
        <FounderWelcomeModal isFounder={isFounder} />
        <EmptyState
          icon={Inbox}
          title={<LocalizedText en="No summaries yet. Paste a group chat to get started." ar="لا توجد ملخصات بعد. الصق محادثة للبدء." />}
          body={
            <LocalizedText
              en="Your history will appear here."
              ar="سيظهر سجلك هنا."
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
    <DashboardShell contentClassName="max-w-6xl">
      <FounderWelcomeModal isFounder={isFounder} />
      <HistoryList
        summaries={summaries}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        query={query}
        totalCount={totalCount}
      />
    </DashboardShell>
  );
}
