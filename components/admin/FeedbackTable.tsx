"use client";

import { startTransition, useDeferredValue, useState } from "react";
import { MessageSquareWarning, RefreshCcw, Save, Search } from "lucide-react";
import type {
  AdminFeedbackData,
  AdminFeedbackPriority,
  AdminFeedbackStatus,
} from "@/lib/admin/types";
import { formatDate, formatNumber } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

async function fetchFeedback() {
  const response = await fetch("/api/admin/feedback", {
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    ok: boolean;
    data?: AdminFeedbackData;
    error?: string;
  };

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Could not load feedback.");
  }

  return payload.data;
}

async function saveFeedback(payload: {
  id: string;
  status: AdminFeedbackStatus;
  priority: AdminFeedbackPriority;
}) {
  const response = await fetch("/api/admin/feedback", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as { ok: boolean; error?: string };

  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "Could not update feedback.");
  }
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="text-sm text-[var(--muted-foreground)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{value}</div>
    </div>
  );
}

export function FeedbackTable({
  initialData,
}: {
  initialData: AdminFeedbackData;
}) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminFeedbackStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [drafts, setDrafts] = useState<
    Record<string, { status: AdminFeedbackStatus; priority: AdminFeedbackPriority }>
  >(
    Object.fromEntries(
      initialData.feedback.map((row) => [
        row.id,
        { status: row.status, priority: row.priority },
      ])
    )
  );

  function updateDraft(
    id: string,
    next: Partial<{ status: AdminFeedbackStatus; priority: AdminFeedbackPriority }>
  ) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        status: next.status ?? current[id]?.status ?? "pending",
        priority: next.priority ?? current[id]?.priority ?? "medium",
      },
    }));
  }

  function handleRefresh() {
    startTransition(() => {
      void (async () => {
        setRefreshing(true);
        setError(null);

        try {
          const nextData = await fetchFeedback();
          setData(nextData);
          setDrafts(
            Object.fromEntries(
              nextData.feedback.map((row) => [
                row.id,
                { status: row.status, priority: row.priority },
              ])
            )
          );
        } catch (refreshError) {
          setError(
            refreshError instanceof Error
              ? refreshError.message
              : "Could not refresh feedback."
          );
        } finally {
          setRefreshing(false);
        }
      })();
    });
  }

  async function handleSave(id: string) {
    const draft = drafts[id];
    if (!draft) {
      return;
    }

    setSavingId(id);
    setError(null);

    try {
      await saveFeedback({
        id,
        status: draft.status,
        priority: draft.priority,
      });
      const nextData = await fetchFeedback();
      setData(nextData);
      setDrafts(
        Object.fromEntries(
          nextData.feedback.map((row) => [
            row.id,
            { status: row.status, priority: row.priority },
          ])
        )
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not update feedback."
      );
    } finally {
      setSavingId(null);
    }
  }

  const filteredFeedback = data.feedback.filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) {
      return false;
    }

    if (typeFilter !== "all" && row.type !== typeFilter) {
      return false;
    }

    if (!deferredSearch) {
      return true;
    }

    return [row.message, row.email ?? "", row.phone ?? "", row.type, row.priority]
      .join(" ")
      .toLowerCase()
      .includes(deferredSearch);
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="User Feedback Monitor"
        description="One founder inbox for bugs, feature requests, complaints, praise, and support tickets."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        }
      />

      {error ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--destructive)]/30 bg-[var(--destructive-soft)] px-4 py-3 text-sm text-[var(--destructive-foreground)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStat label="Total feedback" value={formatNumber(data.total)} />
        <SummaryStat label="Pending" value={formatNumber(data.pending)} />
        <SummaryStat label="Critical" value={formatNumber(data.critical)} />
        <SummaryStat label="Resolved" value={formatNumber(data.resolved)} />
      </div>

      <Card className="bg-[var(--surface-elevated)]">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          <div className="relative">
            <label htmlFor="admin-feedback-search" className="sr-only">
              Search feedback
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              id="admin-feedback-search"
              aria-label="Search feedback"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search message, email, phone, or type"
              className="pl-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as AdminFeedbackStatus | "all")}
            className="h-11 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-11 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
          >
            <option value="all">All types</option>
            {data.byType.map((item) => (
              <option key={item.type} value={item.type}>
                {item.type}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card className="bg-[var(--surface-elevated)]">
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedback.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--muted-foreground)]">
                    <div className="inline-flex items-center gap-2">
                      <MessageSquareWarning className="h-4 w-4" />
                      No feedback matches the current filters.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFeedback.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border)] align-top">
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium capitalize text-[var(--text-strong)]">
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-xl whitespace-pre-wrap text-[var(--text-strong)]">
                        {row.message}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[var(--muted-foreground)]">
                      {row.email ?? row.phone ?? row.userId ?? "Anonymous"}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={drafts[row.id]?.priority ?? row.priority}
                        onChange={(event) =>
                          updateDraft(row.id, {
                            priority: event.target.value as AdminFeedbackPriority,
                          })
                        }
                        className="h-10 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
                      >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                        <option value="critical">critical</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={drafts[row.id]?.status ?? row.status}
                        onChange={(event) =>
                          updateDraft(row.id, {
                            status: event.target.value as AdminFeedbackStatus,
                          })
                        }
                        className="h-10 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
                      >
                        <option value="pending">pending</option>
                        <option value="reviewed">reviewed</option>
                        <option value="resolved">resolved</option>
                        <option value="rejected">rejected</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 text-[var(--muted-foreground)]">
                      {formatDate(row.createdAt, "en", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleSave(row.id)}
                        disabled={savingId === row.id}
                      >
                        <Save className="h-4 w-4" />
                        {savingId === row.id ? "Saving..." : "Save"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
