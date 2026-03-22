"use client";

import { startTransition, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { formatDate } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AuditEntry {
  id: string;
  adminUsername: string;
  action: string;
  targetType: string;
  targetIds: string[];
  details: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
}

interface AuditLogData {
  generatedAt: string;
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  entries: AuditEntry[];
}

const ACTION_COLORS: Record<string, string> = {
  ban_users: "border-red-500/20 bg-red-500/10 text-red-700",
  reset_ban: "border-green-500/20 bg-green-500/10 text-green-700",
  plan_change: "border-blue-500/20 bg-blue-500/10 text-blue-700",
  trial_extend: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  feedback_status_change: "border-purple-500/20 bg-purple-500/10 text-purple-700",
  support_status_change: "border-purple-500/20 bg-purple-500/10 text-purple-700",
};

function formatDateTime(value: string) {
  return formatDate(value, "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function fetchAuditLog(
  page: number,
  pageSize: number,
  action: string,
  targetType: string
): Promise<AuditLogData> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (action) params.set("action", action);
  if (targetType) params.set("targetType", targetType);

  const res = await fetch(`/api/admin/audit-log?${params.toString()}`, { cache: "no-store" });
  const payload = (await res.json()) as { ok: boolean; data?: AuditLogData; error?: string };

  if (!res.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Could not load audit log.");
  }

  return payload.data;
}

export function AdminAuditLogContent() {
  const [data, setData] = useState<AuditLogData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  async function load(p: number, action: string, targetType: string) {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAuditLog(p, pageSize, action, targetType);
      setData(result);
      setPage(p);
      setInitialLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  // Load on first render
  if (!initialLoaded && !loading && !error) {
    startTransition(() => {
      void load(1, actionFilter, targetTypeFilter);
    });
  }

  function handleRefresh() {
    startTransition(() => {
      void load(page, actionFilter, targetTypeFilter);
    });
  }

  function handleFilterChange() {
    startTransition(() => {
      void load(1, actionFilter, targetTypeFilter);
    });
  }

  function handlePageChange(next: number) {
    startTransition(() => {
      void load(next, actionFilter, targetTypeFilter);
    });
  }

  const entries = data?.entries ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit Log"
        description="Immutable record of all admin actions. Read-only."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        }
      />

      {error ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--destructive)]/30 bg-[var(--destructive-soft)] px-4 py-3 text-sm text-[var(--destructive-foreground)]">
          {error}
        </div>
      ) : null}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
        <div className="flex items-center gap-2">
          <label htmlFor="audit-action-filter" className="text-sm text-[var(--muted-foreground)]">
            Action
          </label>
          <select
            id="audit-action-filter"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            <option value="">All actions</option>
            <option value="ban_users">ban_users</option>
            <option value="reset_ban">reset_ban</option>
            <option value="plan_change">plan_change</option>
            <option value="trial_extend">trial_extend</option>
            <option value="feedback_status_change">feedback_status_change</option>
            <option value="support_status_change">support_status_change</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="audit-type-filter" className="text-sm text-[var(--muted-foreground)]">
            Target
          </label>
          <select
            id="audit-type-filter"
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="h-9 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            <option value="">All targets</option>
            <option value="user">user</option>
            <option value="feedback">feedback</option>
            <option value="support">support</option>
            <option value="subscription">subscription</option>
          </select>
        </div>

        <Button type="button" size="sm" variant="outline" onClick={handleFilterChange} disabled={loading}>
          Apply
        </Button>
      </div>

      {data ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          {data.total === 0
            ? "No entries found."
            : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.total)} of ${data.total} entries`}
        </p>
      ) : null}

      <Card className="bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]">
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-medium text-start">Timestamp</th>
                <th className="px-4 py-3 font-medium text-start">Admin</th>
                <th className="px-4 py-3 font-medium text-start">Action</th>
                <th className="px-4 py-3 font-medium text-start">Target</th>
                <th className="px-4 py-3 font-medium text-start">IDs</th>
                <th className="px-4 py-3 font-medium text-start">IP</th>
                <th className="px-4 py-3 font-medium text-start">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--muted-foreground)]">
                    Loading…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--muted-foreground)]">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t border-[var(--border)] align-top hover:bg-[var(--surface-muted)]"
                  >
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-[var(--text-strong)]">
                      {entry.adminUsername}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={ACTION_COLORS[entry.action] ?? "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted-foreground)]"}
                      >
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                      {entry.targetType}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                      {entry.targetIds.length > 0 ? (
                        <div className="space-y-0.5">
                          {entry.targetIds.slice(0, 3).map((id) => (
                            <div key={id} className="font-mono">{id.slice(0, 8)}…</div>
                          ))}
                          {entry.targetIds.length > 3 ? (
                            <div>+{entry.targetIds.length - 3} more</div>
                          ) : null}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                      {entry.ip ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {Object.keys(entry.details).length > 0 ? (
                        <button
                          type="button"
                          className="text-xs text-[var(--primary)] hover:underline"
                          onClick={() =>
                            setExpandedId(expandedId === entry.id ? null : entry.id)
                          }
                        >
                          {expandedId === entry.id ? "Hide" : "Show"}
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">—</span>
                      )}
                      {expandedId === entry.id ? (
                        <pre className="mt-2 max-w-xs overflow-x-auto rounded bg-[var(--surface-muted)] p-2 text-[10px] text-[var(--muted-foreground)]">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pages > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page === 1 || loading}
            onClick={() => handlePageChange(page - 1)}
          >
            Prev
          </Button>
          <span className="text-sm text-[var(--muted-foreground)]">
            Page {page} of {data.pages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page === data.pages || loading}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
