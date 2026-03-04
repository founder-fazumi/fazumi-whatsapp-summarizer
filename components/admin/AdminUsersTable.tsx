"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import {
  ArrowDownWideNarrow,
  Ban,
  Download,
  RefreshCcw,
  RotateCcw,
  Search,
} from "lucide-react";
import type { AdminPlanType, AdminUserRecord, AdminUsersData } from "@/lib/admin/types";
import { formatDate, formatNumber } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SortKey = "joined" | "activity" | "subscription";
type SortDirection = "asc" | "desc";
type BulkAction = "ban" | "reset";

const USERS_PER_PAGE = 50;
const PAGE_STORAGE_KEY = "fazumi_admin_users_page";
const PAGE_SIZE_STORAGE_KEY = "fazumi_admin_users_page_size";

const PLAN_ORDER: Record<AdminPlanType, number> = {
  founder: 0,
  annual: 1,
  monthly: 2,
  trial: 3,
  free: 4,
};

async function fetchUsers() {
  const response = await fetch("/api/admin/users", {
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    ok: boolean;
    data?: AdminUsersData;
    error?: string;
  };

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Could not load admin users.");
  }

  return payload.data;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return formatDate(value, "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isBanned(user: AdminUserRecord) {
  return Boolean(user.bannedUntil && new Date(user.bannedUntil).getTime() > Date.now());
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function getPageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", total];
  }

  if (current >= total - 3) {
    return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

function Pagination({
  currentPage,
  totalPages,
  pageSize,
  hasRows,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasRows: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={pageSize}
        onChange={(event) => onPageSizeChange(Number(event.target.value))}
        className="h-8 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)]"
      >
        <option value={25}>25/page</option>
        <option value={50}>50/page</option>
        <option value={100}>100/page</option>
      </select>

      <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={!hasRows || currentPage === 1}>
        First
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={!hasRows || currentPage === 1}>
        Prev
      </Button>

      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1 text-sm text-[var(--muted-foreground)]">
              ...
            </span>
          ) : (
            <Button
              key={page}
              type="button"
              variant={page === currentPage ? "default" : "ghost"}
              size="sm"
              onClick={() => onPageChange(page)}
              disabled={!hasRows}
              className="w-8 px-0"
            >
              {page}
            </Button>
          )
        )}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={!hasRows || currentPage === totalPages}>
        Next
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={!hasRows || currentPage === totalPages}>
        Last
      </Button>
    </div>
  );
}

interface AdminUsersTableProps {
  initialData: AdminUsersData;
}

export function AdminUsersTable({ initialData }: AdminUsersTableProps) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<BulkAction | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(USERS_PER_PAGE);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  useEffect(() => {
    try {
      const storedPage = Number(window.localStorage.getItem(PAGE_STORAGE_KEY));
      const storedPageSize = Number(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY));

      if (storedPageSize === 25 || storedPageSize === 50 || storedPageSize === 100) {
        setPageSize(storedPageSize);
      }

      if (Number.isFinite(storedPage) && storedPage > 0) {
        setCurrentPage(Math.floor(storedPage));
      }
    } catch {
      // Ignore storage read failures.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PAGE_STORAGE_KEY, String(currentPage));
      window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
    } catch {
      // Ignore storage write failures.
    }
  }, [currentPage, pageSize]);

  async function refreshUsers() {
    setRefreshing(true);
    setError(null);

    try {
      setData(await fetchUsers());
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Could not refresh admin users."
      );
    } finally {
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    startTransition(() => {
      void refreshUsers();
    });
  }

  const filteredUsers = data.users
    .filter((user) => {
      if (!deferredSearch) {
        return true;
      }

      const haystack = [
        user.displayName,
        user.email ?? "",
        user.phone ?? "",
        user.id,
        user.subscriptionType,
        user.country,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(deferredSearch);
    })
    .sort((left, right) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "subscription") {
        return (PLAN_ORDER[left.subscriptionType] - PLAN_ORDER[right.subscriptionType]) * direction;
      }

      const leftValue =
        sortKey === "joined"
          ? new Date(left.joinedAt ?? 0).getTime()
          : new Date(left.activityAt ?? 0).getTime();
      const rightValue =
        sortKey === "joined"
          ? new Date(right.joinedAt ?? 0).getTime()
          : new Date(right.activityAt ?? 0).getTime();

      return (leftValue - rightValue) * direction;
    });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  useEffect(() => {
    setCurrentPage((current) => Math.min(Math.max(current, 1), totalPages));
  }, [totalPages]);

  const startIndex = filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = filteredUsers.length === 0 ? 0 : Math.min(startIndex + pageSize, filteredUsers.length);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
  const selectedCount = filteredUsers.filter((user) => selectedUserIds.has(user.id)).length;
  const allVisibleSelected =
    paginatedUsers.length > 0 &&
    paginatedUsers.every((user) => selectedUserIds.has(user.id));

  function setPage(page: number) {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function handleSortKeyChange(value: SortKey) {
    setSortKey(value);
    setCurrentPage(1);
  }

  function handleSortDirectionToggle() {
    setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    setCurrentPage(1);
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setCurrentPage(1);
  }

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((current) => {
      const next = new Set(current);

      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }

      return next;
    });
  }

  function toggleVisibleSelection() {
    setSelectedUserIds((current) => {
      const next = new Set(current);

      if (allVisibleSelected) {
        paginatedUsers.forEach((user) => next.delete(user.id));
      } else {
        paginatedUsers.forEach((user) => next.add(user.id));
      }

      return next;
    });
  }

  async function handleBulkAction(action: BulkAction) {
    const userIds = Array.from(selectedUserIds);

    if (userIds.length === 0) {
      return;
    }

    setSubmittingAction(action);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          userIds,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        updatedIds?: string[];
        failed?: Array<{ userId: string; error: string }>;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Bulk action failed.");
      }

      await refreshUsers();
      setSelectedUserIds(new Set());
      setSuccess(
        action === "ban"
          ? `Banned ${payload.updatedIds?.length ?? 0} user(s).`
          : `Reset access for ${payload.updatedIds?.length ?? 0} user(s).`
      );

      if (payload.failed && payload.failed.length > 0) {
        setError(`${payload.failed.length} user updates failed.`);
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Bulk action failed."
      );
    } finally {
      setSubmittingAction(null);
    }
  }

  function handleExport() {
    const selectedUsers = data.users.filter((user) => selectedUserIds.has(user.id));

    if (selectedUsers.length === 0) {
      return;
    }

    const header = [
      "User ID",
      "Name",
      "Email",
      "Phone",
      "Subscription",
      "Country",
      "Banned Until",
      "Last Activity",
      "Joined At",
    ];
    const lines = [
      header.map(escapeCsvCell).join(","),
      ...selectedUsers.map((user) =>
        [
          user.id,
          user.displayName,
          user.email ?? "",
          user.phone ?? "",
          user.subscriptionType,
          user.country,
          user.bannedUntil ?? "",
          user.activityAt ?? "",
          user.joinedAt ?? "",
        ]
          .map((value) => escapeCsvCell(String(value)))
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fazumi-users-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    setSuccess(`Exported ${selectedUsers.length} user(s).`);
  }

  const rangeLabel =
    filteredUsers.length === 0
      ? "Showing 0 of 0 users"
      : `Showing ${formatNumber(startIndex + 1)}-${formatNumber(endIndex)} of ${formatNumber(filteredUsers.length)} users`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description="50 rows per page by default, with persistent pagination controls at the top and bottom of the roster."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
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

      {success ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--success)]/30 bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success-foreground)]">
          {success}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-4 md:grid-cols-[minmax(0,1fr)_12rem_8rem]">
        <div className="relative">
          <label htmlFor="admin-users-search" className="sr-only">
            Search users
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            id="admin-users-search"
            aria-label="Search users"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search by name, email, phone, user ID, or country"
            className="pl-10"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <span className="shrink-0">Sort by</span>
          <select
            value={sortKey}
            onChange={(event) => handleSortKeyChange(event.target.value as SortKey)}
            className="h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            <option value="joined">Joined</option>
            <option value="activity">Activity</option>
            <option value="subscription">Subscription</option>
          </select>
        </label>

        <Button type="button" variant="outline" onClick={handleSortDirectionToggle}>
          <ArrowDownWideNarrow className="h-4 w-4" />
          {sortDirection === "asc" ? "Ascending" : "Descending"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1 text-sm text-[var(--muted-foreground)]">
          <div>{rangeLabel}</div>
          <div>
            Total dataset {formatNumber(data.total)} / Selected {formatNumber(selectedCount)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void handleBulkAction("ban")} disabled={selectedUserIds.size === 0 || submittingAction !== null}>
            <Ban className="h-4 w-4" />
            {submittingAction === "ban" ? "Banning..." : "Ban 1 year"}
          </Button>
          <Button type="button" variant="outline" onClick={() => void handleBulkAction("reset")} disabled={selectedUserIds.size === 0 || submittingAction !== null}>
            <RotateCcw className="h-4 w-4" />
            {submittingAction === "reset" ? "Resetting..." : "Reset access"}
          </Button>
          <Button type="button" variant="outline" onClick={handleExport} disabled={selectedUserIds.size === 0 || submittingAction !== null}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">{rangeLabel}</p>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          hasRows={filteredUsers.length > 0}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      <Card className="bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]">
        <div className="border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleVisibleSelection}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            <span>Select page users ({paginatedUsers.filter((user) => selectedUserIds.has(user.id)).length})</span>
          </label>
        </div>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-medium text-start">Select</th>
                <th className="px-4 py-3 font-medium text-start">User</th>
                <th className="px-4 py-3 font-medium text-start">Plan</th>
                <th className="px-4 py-3 font-medium text-start">Status</th>
                <th className="px-4 py-3 font-medium text-start">Country</th>
                <th className="px-4 py-3 font-medium text-start">Activity</th>
                <th className="px-4 py-3 font-medium text-start">Joined</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--muted-foreground)]">
                    No users match the current filters.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-t border-[var(--border)] align-top hover:bg-[var(--surface-muted)]">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="h-4 w-4 accent-[var(--primary)]"
                        aria-label={`Select ${user.displayName}`}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-[var(--text-strong)]">{user.displayName}</div>
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {user.email ?? user.phone ?? user.id}
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        ID {user.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium capitalize text-[var(--text-strong)]">
                        {user.subscriptionType}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {isBanned(user) ? (
                        <div className="space-y-1">
                          <span className="inline-flex rounded-full bg-[var(--destructive-soft)] px-2.5 py-1 text-xs font-medium text-[var(--destructive-foreground)]">
                            Banned
                          </span>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            Until {formatDateTime(user.bannedUntil)}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-xs font-medium text-[var(--success-foreground)]">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[var(--muted-foreground)]">{user.country}</td>
                    <td className="px-4 py-4 text-[var(--muted-foreground)]">{formatDateTime(user.activityAt)}</td>
                    <td className="px-4 py-4 text-[var(--muted-foreground)]">{formatDateTime(user.joinedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">{rangeLabel}</p>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          hasRows={filteredUsers.length > 0}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
}
