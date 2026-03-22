"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownWideNarrow,
  Ban,
  Download,
  Eye,
  MoreHorizontal,
  RefreshCcw,
  RotateCcw,
  Search,
} from "lucide-react";
import type { AdminPlanType, AdminUserRecord, AdminUsersData } from "@/lib/admin/types";
import { AdminAvatarStack } from "@/components/admin/AdminAvatarStack";
import { AdminUserDetailDrawer } from "@/components/admin/AdminUserDetailDrawer";
import { formatDate, formatNumber } from "@/lib/format";
import { useLang } from "@/lib/context/LangContext";
import { ChurnRiskBadge } from "@/components/admin/ChurnRiskBadge";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type SortKey = "joined" | "activity" | "subscription";
type SortDirection = "asc" | "desc";
type BulkAction = "ban" | "reset";

const USERS_PER_PAGE = 50;
const PAGE_SIZE_STORAGE_KEY = "fazumi_admin_users_page_size";
const PLAN_OPTIONS: AdminPlanType[] = ["free", "trial", "monthly", "annual", "founder"];

const PLAN_ORDER: Record<AdminPlanType, number> = {
  founder: 0,
  annual: 1,
  monthly: 2,
  trial: 3,
  free: 4,
};

const SUB_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "border-green-500/20 bg-green-500/10 text-green-700" },
  cancelled: { label: "Cancelled", className: "border-amber-500/20 bg-amber-500/10 text-amber-700" },
  past_due: { label: "Past due", className: "border-red-500/20 bg-red-500/10 text-red-700" },
  expired: { label: "Expired", className: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted-foreground)]" },
};

async function fetchUsers(page = 1, pageSize = USERS_PER_PAGE, search = "") {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (search) {
    params.set("q", search);
  }

  const response = await fetch(`/api/admin/users?${params.toString()}`, {
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
    return "—";
  }

  return formatDate(value, "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateOnly(value: string | null) {
  if (!value) {
    return "—";
  }

  return formatDate(value, "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isBanned(user: AdminUserRecord) {
  return Boolean(user.bannedUntil && new Date(user.bannedUntil).getTime() > Date.now());
}

function isTrialActive(user: AdminUserRecord) {
  return Boolean(
    user.trialExpiresAt && new Date(user.trialExpiresAt).getTime() > Date.now()
  );
}

function escapeCsvCell(value: string) {
  const safe = /^[=+\-@]/.test(value) ? `\t${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
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
  const { locale } = useLang();
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<BulkAction | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [pendingBanUserIds, setPendingBanUserIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(USERS_PER_PAGE);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const storedPageSize = Number(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY));

      if (storedPageSize === 25 || storedPageSize === 50 || storedPageSize === 100) {
        void loadPage(1, storedPageSize, "");
      }
    } catch {
      // Ignore storage read failures.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
    } catch {
      // Ignore storage write failures.
    }
  }, [pageSize]);

  const loadPage = useCallback(async (page: number, size: number, q: string) => {
    setRefreshing(true);
    setError(null);

    try {
      const next = await fetchUsers(page, size, q);
      setData(next);
      setCurrentPage(next.page);
      setPageSize(next.pageSize);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load admin users."
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  function handleRefresh() {
    startTransition(() => {
      void loadPage(currentPage, pageSize, search);
    });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setSelectedUserIds(new Set());

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Debounce server-side search by 400ms
    searchTimeout.current = setTimeout(() => {
      startTransition(() => {
        void loadPage(1, pageSize, value.trim());
      });
    }, 400);
  }

  const localUsers = data.users;

  const sortedUsers = [...localUsers].sort((left, right) => {
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

  const recentUsers = [...localUsers]
    .sort((left, right) => (right.activityAt ?? "").localeCompare(left.activityAt ?? ""))
    .slice(0, 5)
    .map((user) => ({
      id: user.id,
      name: user.displayName ?? "",
      email: user.email ?? "",
    }));

  const totalPages = data.pages;
  const selectedCount = sortedUsers.filter((user) => selectedUserIds.has(user.id)).length;
  const allVisibleSelected =
    sortedUsers.length > 0 &&
    sortedUsers.every((user) => selectedUserIds.has(user.id));

  function setPage(page: number) {
    const next = Math.min(Math.max(page, 1), totalPages);
    startTransition(() => {
      void loadPage(next, pageSize, search);
    });
  }

  function handleSortKeyChange(value: SortKey) {
    setSortKey(value);
  }

  function handleSortDirectionToggle() {
    setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
  }

  function handlePageSizeChange(size: number) {
    startTransition(() => {
      void loadPage(1, size, search);
    });
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
        sortedUsers.forEach((user) => next.delete(user.id));
      } else {
        sortedUsers.forEach((user) => next.add(user.id));
      }

      return next;
    });
  }

  async function handleBulkAction(action: BulkAction, ids?: string[]) {
    const userIds = ids ?? Array.from(selectedUserIds);

    if (userIds.length === 0) {
      return;
    }

    if (action === "ban" && !ids) {
      setPendingBanUserIds(userIds);
      return;
    }

    setSubmittingAction(action);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userIds }),
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

      await loadPage(currentPage, pageSize, search);
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

  async function confirmBan() {
    await handleBulkAction("ban", pendingBanUserIds);
    setPendingBanUserIds([]);
  }

  function handleBan(userIds: string[]) {
    setPendingBanUserIds(userIds);
  }

  async function handleResetBan(userIds: string[]) {
    await handleBulkAction("reset", userIds);
  }

  async function handlePlanChange(userId: string, plan: AdminPlanType) {
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/users/plan-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        warning?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not change plan.");
      }

      if (payload.warning) {
        setSuccess(`Plan changed. Note: ${payload.warning}`);
      } else {
        setSuccess(
          locale === "ar"
            ? "تم تحديث خطة المستخدم."
            : `Updated user plan to ${plan}.`
        );
      }

      await loadPage(currentPage, pageSize, search);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Could not change plan."
      );
    }
  }

  async function handleTrialExtend(userId: string) {
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/users/trial-extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, days: 7 }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        newExpiresAt?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not extend trial.");
      }

      setSuccess(
        locale === "ar"
          ? "تم تمديد التجربة لمدة 7 أيام."
          : "Extended trial by 7 days."
      );
      await loadPage(currentPage, pageSize, search);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Could not extend trial."
      );
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
      "Plan",
      "Sub Status",
      "Trial Expires",
      "Summaries (30d)",
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
          user.subscriptionStatus ?? "",
          user.trialExpiresAt ?? "",
          String(user.summariesLast30Days),
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

  const rangeStart = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const rangeEnd = Math.min(data.page * data.pageSize, data.total);
  const rangeLabel =
    data.total === 0
      ? "Showing 0 of 0 users"
      : `Showing ${formatNumber(rangeStart)}–${formatNumber(rangeEnd)} of ${formatNumber(data.total)} users`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description="Search across all users. Results are paginated server-side."
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
        <div className="space-y-3 md:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-[var(--text-strong)]">
                {locale === "ar" ? "المستخدمون" : "Users"}
              </h2>
              <AdminAvatarStack users={recentUsers} max={5} />
            </div>

            <div className="relative w-full md:max-w-sm">
              <label htmlFor="admin-users-search" className="sr-only">
                Search users
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                id="admin-users-search"
                aria-label="Search users"
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search by name, email, phone, or user ID"
                className="pl-10"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    void loadPage(1, pageSize, "");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>
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
            Selected {formatNumber(selectedCount)}
            {search ? <span className="ml-2 text-[var(--primary)]">· Search: &quot;{search}&quot;</span> : null}
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
          hasRows={sortedUsers.length > 0}
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
            <span>Select page ({sortedUsers.filter((user) => selectedUserIds.has(user.id)).length} selected)</span>
          </label>
        </div>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-medium text-start">Select</th>
                <th className="px-4 py-3 font-medium text-start">User</th>
                <th className="px-4 py-3 font-medium text-start">Plan</th>
                <th className="px-4 py-3 font-medium text-start">Sub status</th>
                <th className="px-4 py-3 font-medium text-start">Trial expires</th>
                <th className="px-4 py-3 font-medium text-start">Summaries (30d)</th>
                <th className="px-4 py-3 font-medium text-start">Churn risk</th>
                <th className="px-4 py-3 font-medium text-start">Country</th>
                <th className="px-4 py-3 font-medium text-start">Last activity</th>
                <th className="px-4 py-3 font-medium text-start">Joined</th>
                <th className="px-4 py-3 font-medium text-start">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-[var(--muted-foreground)]">
                    {search ? `No users match "${search}".` : "No users found."}
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user) => {
                  const userIsBanned = isBanned(user);
                  const trialActive = isTrialActive(user);
                  const subStatusConfig = user.subscriptionStatus
                    ? SUB_STATUS_BADGE[user.subscriptionStatus]
                    : null;

                  return (
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
                        {userIsBanned ? (
                          <div className="mt-1 text-xs text-[var(--destructive)]">
                            Banned until {formatDateTime(user.bannedUntil)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium capitalize text-[var(--text-strong)]">
                          {user.subscriptionType}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {subStatusConfig ? (
                          <Badge variant="outline" className={subStatusConfig.className}>
                            {subStatusConfig.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-[var(--muted-foreground)]">
                        {user.trialExpiresAt ? (
                          <span className={trialActive ? "text-green-700" : "text-[var(--muted-foreground)]"}>
                            {formatDateOnly(user.trialExpiresAt)}
                            {trialActive ? " ✓" : " (ended)"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-[var(--muted-foreground)]">
                        {user.summariesLast30Days > 0 ? (
                          <span className="font-medium text-[var(--text-strong)]">{user.summariesLast30Days}</span>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <ChurnRiskBadge lastActiveAt={user.activityAt ?? null} locale={locale} />
                      </td>
                      <td className="px-4 py-4 text-xs text-[var(--muted-foreground)]">{user.country}</td>
                      <td className="px-4 py-4 text-xs text-[var(--muted-foreground)]">{formatDateTime(user.activityAt)}</td>
                      <td className="px-4 py-4 text-xs text-[var(--muted-foreground)]">{formatDateTime(user.joinedAt)}</td>
                      <td className="px-4 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 px-0">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">User actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDetailUserId(user.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                Change plan
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {PLAN_OPTIONS.map((plan) => (
                                  <DropdownMenuItem
                                    key={plan}
                                    onClick={() => void handlePlanChange(user.id, plan)}
                                  >
                                    {plan}
                                    {plan === user.subscriptionType ? " ✓" : ""}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuItem onClick={() => void handleTrialExtend(user.id)}>
                              Extend trial (+7d)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-[var(--destructive)] hover:bg-[var(--destructive-soft)]"
                              onClick={() => void handleBan([user.id])}
                            >
                              Ban user for 1 year
                            </DropdownMenuItem>
                            {userIsBanned ? (
                              <DropdownMenuItem onClick={() => void handleResetBan([user.id])}>
                                Remove ban
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
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
          hasRows={sortedUsers.length > 0}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {/* Ban confirmation dialog */}
      <Dialog
        open={pendingBanUserIds.length > 0}
        onOpenChange={(open) => { if (!open) setPendingBanUserIds([]); }}
        title={`Ban ${pendingBanUserIds.length} user${pendingBanUserIds.length !== 1 ? "s" : ""} for 1 year?`}
      >
        <p className="text-sm text-[var(--muted-foreground)] leading-6">
          These users will be unable to log in for 1 year. You can remove the ban at any time from this admin panel using the &quot;Remove ban&quot; action.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setPendingBanUserIds([])}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={submittingAction === "ban"}
            onClick={() => void confirmBan()}
          >
            {submittingAction === "ban" ? "Banning…" : "Confirm ban"}
          </Button>
        </div>
      </Dialog>

      {/* User detail drawer */}
      {detailUserId ? (
        <AdminUserDetailDrawer
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          onPlanChange={async (userId, plan) => {
            await handlePlanChange(userId, plan);
          }}
          onTrialExtend={async (userId) => {
            await handleTrialExtend(userId);
          }}
          onBan={(userId) => handleBan([userId])}
          onResetBan={async (userId) => {
            await handleResetBan([userId]);
          }}
        />
      ) : null}
    </div>
  );
}
