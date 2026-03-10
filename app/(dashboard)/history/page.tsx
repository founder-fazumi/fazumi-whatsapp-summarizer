import { FounderWelcomeModal } from "@/components/founder/FounderWelcomeModal";
import { HistoryList } from "@/components/history/HistoryList";
import type { SummaryRow } from "@/components/history/types";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { resolveEntitlement, type EntitlementSubscription } from "@/lib/limits";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;
const OPTIONAL_HISTORY_FIELDS = [
  "group_name",
  "source_kind",
  "source_range",
  "new_messages_count",
] as const;

type OptionalHistoryField = (typeof OPTIONAL_HISTORY_FIELDS)[number];

function sanitizeSearch(value: string) {
  return value.trim().replace(/[,%]/g, " ");
}

function getMissingHistoryField(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}): OptionalHistoryField | null {
  const code = error.code ?? "";
  const message = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();

  const looksLikeMissingColumn =
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("schema cache") ||
    message.includes("column") ||
    message.includes("does not exist") ||
    message.includes("could not find");

  if (!looksLikeMissingColumn) {
    return null;
  }

  return OPTIONAL_HISTORY_FIELDS.find((field) => message.includes(field)) ?? null;
}

function buildHistoryQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  query: string,
  omittedFields = new Set<OptionalHistoryField>()
) {
  const fields = [
    "id",
    "title",
    "tldr",
    "created_at",
    "char_count",
    "lang_detected",
    ...OPTIONAL_HISTORY_FIELDS.filter((field) => !omittedFields.has(field)),
  ].join(", ");
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
  const omittedFields = new Set<OptionalHistoryField>();

  for (let attempt = 0; attempt <= OPTIONAL_HISTORY_FIELDS.length; attempt += 1) {
    const response = await buildHistoryQuery(supabase, userId, query, omittedFields).range(from, to);
    const missingField = response.error ? getMissingHistoryField(response.error) : null;

    if (!response.error || !missingField || omittedFields.has(missingField)) {
      const fallbackRows = ((response.data ?? []) as unknown as Array<Partial<SummaryRow> & Pick<SummaryRow, "id" | "title" | "tldr" | "created_at" | "char_count" | "lang_detected">>);
      return {
        ...response,
        data: fallbackRows.map((summary) => ({
          id: summary.id,
          title: summary.title,
          tldr: summary.tldr,
          created_at: summary.created_at,
          char_count: summary.char_count,
          lang_detected: summary.lang_detected,
          group_name: summary.group_name ?? null,
          source_kind: summary.source_kind ?? "text",
          source_range: summary.source_range ?? null,
          new_messages_count: summary.new_messages_count ?? null,
        })),
      };
    }

    omittedFields.add(missingField);
  }

  return {
    data: [] as SummaryRow[],
    count: 0,
    error: null,
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
