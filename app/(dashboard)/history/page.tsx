import { FounderWelcomeModal } from "@/components/founder/FounderWelcomeModal";
import { HistoryList } from "@/components/history/HistoryList";
import type { SummaryRow } from "@/components/history/types";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { resolveEntitlement, type EntitlementSubscription } from "@/lib/limits";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;

function sanitizeSearch(value: string) {
  return value.trim().replace(/[,%]/g, " ");
}

function isMissingSummaryGroupNameColumnError(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}) {
  const code = error.code ?? "";
  const message = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();

  return (
    message.includes("group_name") &&
    (
      code === "42703" ||
      code === "PGRST204" ||
      message.includes("schema cache") ||
      message.includes("column") ||
      message.includes("does not exist") ||
      message.includes("could not find")
    )
  );
}

function buildHistoryQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  query: string,
  includeGroupName = true
) {
  const fields = includeGroupName
    ? "id, title, tldr, created_at, char_count, group_name, lang_detected, source_kind, source_range, new_messages_count"
    : "id, title, tldr, created_at, char_count, lang_detected, source_kind, source_range, new_messages_count";
  let request = supabase
    .from("summaries")
    .select(fields, { count: "exact" })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (query) {
    request = request.or(`title.ilike.%${query}%,tldr.ilike.%${query}%`);
  }

  return request.order("created_at", { ascending: false });
}

async function loadHistoryPage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  query: string,
  from: number,
  to: number
) {
  let response = await buildHistoryQuery(supabase, userId, query, true).range(from, to);

  if (response.error && isMissingSummaryGroupNameColumnError(response.error)) {
    response = await buildHistoryQuery(supabase, userId, query, false).range(from, to);
    const fallbackRows = ((response.data ?? []) as unknown as Omit<SummaryRow, "group_name">[]);
    return {
      ...response,
      data: fallbackRows.map((summary) => ({
        ...summary,
        group_name: null,
      })),
    };
  }

  return {
    ...response,
    data: (response.data as SummaryRow[] | null) ?? [],
  };
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
        loadHistoryPage(supabase, user.id, query, from, to),
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
        response = await loadHistoryPage(
          supabase,
          user.id,
          query,
          safeFrom,
          safeFrom + PAGE_SIZE - 1
        );
        totalCount = response.count ?? totalCount;
      }

      summaries = response.data ?? [];
    }
  } catch {
    // Supabase not configured
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
