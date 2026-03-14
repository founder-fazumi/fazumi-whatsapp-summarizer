"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Check, ChevronRight, FileText, Inbox, Link2, Search, Trash2 } from "lucide-react";
import type { SummaryRow } from "@/components/history/types";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLang } from "@/lib/context/LangContext";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const LANG_LABEL: Record<string, string> = { en: "EN", ar: "AR" };

function getRangeLabel(range: "24h" | "7d" | null, locale: "en" | "ar") {
  if (range === "24h") {
    return locale === "ar" ? "آخر 24 ساعة" : "Last 24 hours";
  }

  if (range === "7d") {
    return locale === "ar" ? "آخر 7 أيام" : "Last 7 days";
  }

  return null;
}

interface Props {
  summaries: SummaryRow[];
  currentPage: number;
  pageSize: number;
  query: string;
  totalCount: number;
}

function buildHistoryHref(pathname: string, query: string, page: number) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function HistoryList({
  summaries,
  currentPage,
  pageSize,
  query,
  totalCount,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useLang();
  const isRtl = locale === "ar";
  const [localSummaries, setLocalSummaries] = useState(summaries);
  const [searchValue, setSearchValue] = useState(query);
  const [groupFilter, setGroupFilter] = useState("");
  const [clientTotalCount, setClientTotalCount] = useState(totalCount);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const groupOptions = Array.from(
    new Set(summaries.map((summary) => summary.group_name).filter((groupName): groupName is string => Boolean(groupName)))
  ).sort();
  const displayedSummaries = groupFilter
    ? localSummaries.filter((summary) => summary.group_name === groupFilter)
    : localSummaries;
  const displayedIds = displayedSummaries.map((summary) => summary.id);
  const selectedIdSet = new Set(selectedIds);
  const selectedCount = selectedIds.length;
  const allDisplayedSelected =
    displayedIds.length > 0 && displayedIds.every((summaryId) => selectedIdSet.has(summaryId));
  const deleteTargetCount = pendingDeleteIds?.length ?? 0;

  useEffect(() => {
    setLocalSummaries(summaries);
    setSearchValue(query);
    setClientTotalCount(totalCount);
    setSelectedIds([]);
    setPendingDeleteIds(null);
  }, [query, summaries, totalCount]);

  useEffect(() => {
    if (groupFilter && !groupOptions.includes(groupFilter)) {
      setGroupFilter("");
    }
  }, [groupFilter, groupOptions]);

  useEffect(() => {
    setSelectedIds([]);
    setPendingDeleteIds(null);
  }, [groupFilter]);

  async function handleDelete(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids));
    const deletedOnPageCount = localSummaries.filter((summary) => uniqueIds.includes(summary.id)).length;

    if (deletedOnPageCount === 0) {
      setPendingDeleteIds(null);
      return;
    }

    setIsDeleting(true);
    setActionError(null);

    const previousSummaries = localSummaries;
    const previousTotal = clientTotalCount;
    const nextCount = Math.max(0, previousTotal - deletedOnPageCount);

    setLocalSummaries((current) => current.filter((summary) => !uniqueIds.includes(summary.id)));
    setSelectedIds((current) => current.filter((summaryId) => !uniqueIds.includes(summaryId)));
    setClientTotalCount(nextCount);

    try {
      const response = await fetch("/api/summaries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: uniqueIds }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; deletedCount?: number }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Could not delete summaries.");
      }

      const lastPage = Math.max(1, Math.ceil(nextCount / pageSize));
      if (nextCount > 0 && currentPage > lastPage && pathname) {
        router.push(buildHistoryHref(pathname, query, lastPage));
        return;
      }

      if (pathname) {
        router.refresh();
      }
    } catch {
      setLocalSummaries(previousSummaries);
      setClientTotalCount(previousTotal);
      setActionError(
        locale === "ar"
          ? uniqueIds.length === 1
            ? "تعذر حذف الملخص. حاول مرة أخرى."
            : "تعذر حذف الملخصات المحددة. حاول مرة أخرى."
          : uniqueIds.length === 1
            ? "Could not delete the summary. Try again."
            : "Could not delete the selected summaries. Try again."
      );
    } finally {
      setIsDeleting(false);
      setPendingDeleteIds(null);
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pathname) {
      router.push(buildHistoryHref(pathname, searchValue.trim(), 1));
    }
  }

  function clearSearch() {
    setSearchValue("");
    if (pathname) {
      router.push(pathname);
    }
  }

  async function handleShare(id: string) {
    const url = `${window.location.origin}/history/${id}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 2000);
    } catch {
      setActionError(locale === "ar" ? "تعذر نسخ الرابط. حاول مرة أخرى." : "Could not copy the link. Try again.");
    }
  }

  function toggleSelection(summaryId: string) {
    setSelectedIds((current) =>
      current.includes(summaryId)
        ? current.filter((id) => id !== summaryId)
        : [...current, summaryId]
    );
  }

  function toggleAllDisplayed() {
    setSelectedIds((current) => {
      const currentSet = new Set(current);

      if (allDisplayedSelected) {
        return current.filter((summaryId) => !displayedIds.includes(summaryId));
      }

      for (const summaryId of displayedIds) {
        currentSet.add(summaryId);
      }

      return Array.from(currentSet);
    });
  }

  function openDeleteDialog(ids: string[]) {
    if (ids.length === 0) {
      return;
    }

    setPendingDeleteIds(Array.from(new Set(ids)));
  }

  const totalPages = Math.max(1, Math.ceil(clientTotalCount / pageSize));
  const startItem = clientTotalCount === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const endItem = startItem === 0 ? 0 : startItem + Math.max(localSummaries.length - 1, 0);
  const isFirstHistoryEmpty = clientTotalCount === 0 && !query && !groupFilter;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      lang={locale}
      className={cn("space-y-6", isRtl && "font-arabic")}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[var(--text-2xl)] font-bold text-[var(--text-strong)] sm:text-[var(--text-3xl)]">
            {locale === "ar" ? "السجل" : "History"}
          </h1>
          <p className="mt-2 text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
            {locale === "ar"
              ? "ابحث في الملخصات المحفوظة وافتحها أو شاركها عند الحاجة."
              : "Search saved summaries, reopen them, or share them when needed."}
          </p>
        </div>

        {clientTotalCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text-sm)] text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={allDisplayedSelected}
                onChange={toggleAllDisplayed}
                data-testid="history-select-all"
                className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
              />
              <span>{locale === "ar" ? "تحديد كل الظاهر" : "Select visible"}</span>
            </label>
            {selectedCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => openDeleteDialog(selectedIds)}
                data-testid="history-delete-selected"
                className="justify-start text-[var(--destructive)] hover:bg-[var(--destructive-soft)] hover:text-[var(--destructive)] md:justify-center"
              >
                <Trash2 className="h-4 w-4" />
                {locale === "ar"
                  ? `حذف المحدد (${formatNumber(selectedCount)})`
                  : `Delete selected (${formatNumber(selectedCount)})`}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {actionError ? (
        <div className="status-destructive rounded-[var(--radius-xl)] border px-4 py-3 text-sm" role="alert" aria-live="polite">
          {actionError}
        </div>
      ) : null}

      {!isFirstHistoryEmpty ? (
        <div className="surface-panel bg-[var(--surface-elevated)] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            {groupOptions.length > 0 ? (
              <div className="md:w-60">
                <label htmlFor="history-group-filter" className="mb-2 block text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                  {locale === "ar" ? "المجموعة" : "Group"}
                </label>
                <select
                  id="history-group-filter"
                  dir={isRtl ? "rtl" : "ltr"}
                  aria-label={locale === "ar" ? "تصفية حسب المجموعة" : "Filter by group"}
                  value={groupFilter}
                  onChange={(event) => setGroupFilter(event.target.value)}
                  className="h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
                >
                  <option value="">{locale === "ar" ? "كل المجموعات" : "All groups"}</option>
                  {groupOptions.map((groupName) => (
                    <option key={groupName} value={groupName}>
                      {groupName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <form onSubmit={handleSearchSubmit} className="flex flex-1 flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <label htmlFor="history-search" className="sr-only">
                  {locale === "ar" ? "ابحث في السجل" : "Search history"}
                </label>
                <Search className={cn("pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]", isRtl ? "right-3.5" : "left-3.5")} />
                <Input
                  id="history-search"
                  aria-label={locale === "ar" ? "ابحث في السجل" : "Search history"}
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder={locale === "ar" ? "ابحث في العناوين والملخصات..." : "Search titles and summaries..."}
                  className={cn(isRtl ? "pr-10" : "pl-10")}
                />
              </div>
              <Button type="submit" variant="outline">
                {locale === "ar" ? "بحث" : "Search"}
              </Button>
              {query ? (
                <Button type="button" variant="ghost" onClick={clearSearch}>
                  {locale === "ar" ? "مسح" : "Clear"}
                </Button>
              ) : null}
            </form>
          </div>

          <div className="mt-4 flex flex-col gap-2 text-[var(--text-sm)] text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
            <p>
              {clientTotalCount === 0
                ? locale === "ar"
                  ? "لا توجد نتائج مطابقة."
                  : "No matching summaries."
                : groupFilter
                  ? locale === "ar"
                    ? `عرض ${formatNumber(displayedSummaries.length)} من ${formatNumber(localSummaries.length)} للمجموعة المحددة`
                    : `Showing ${formatNumber(displayedSummaries.length)} of ${formatNumber(localSummaries.length)} for this group`
                  : locale === "ar"
                    ? `عرض ${formatNumber(startItem)}-${formatNumber(endItem)} من ${formatNumber(clientTotalCount)}`
                    : `Showing ${formatNumber(startItem)}-${formatNumber(endItem)} of ${formatNumber(clientTotalCount)}`}
            </p>
            <p>
              {totalPages > 1
                ? locale === "ar"
                  ? `الصفحة ${formatNumber(currentPage)} من ${formatNumber(totalPages)}`
                  : `Page ${formatNumber(currentPage)} of ${formatNumber(totalPages)}`
                : query
                  ? locale === "ar"
                    ? "تم تطبيق البحث"
                    : "Search applied"
                  : locale === "ar"
                    ? "آخر الملخصات المحفوظة"
                    : "Latest saved summaries"}
            </p>
          </div>
        </div>
      ) : null}

      {isFirstHistoryEmpty ? (
        <EmptyState
          icon={FileText}
          title={locale === "ar" ? "لا ملخصات بعد" : "No summaries yet"}
          body={
            locale === "ar"
              ? "كل ملخص تنشئه يُحفظ هنا — قابل للبحث ومتاح عند الحاجة للتحقق من موعد أو تاريخ من فصل دراسي سابق."
              : "Every summary you create is saved here — searchable and available when you need to check a deadline or date from a previous school term."
          }
          cta={{
            label: locale === "ar" ? "لخِّص أول محادثة لك ←" : "Summarise your first chat →",
            href: "/summarize",
          }}
          className="py-10"
        />
      ) : displayedSummaries.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            groupFilter
              ? (locale === "ar" ? "لا توجد ملخصات لهذه المجموعة." : "No summaries for this group.")
              : (locale === "ar" ? "لا توجد نتائج مطابقة." : "No matching summaries.")
          }
          body={
            groupFilter
              ? (locale === "ar" ? "اختر مجموعة أخرى أو اعرض كل المجموعات." : "Pick another group or show all groups.")
              : (locale === "ar" ? "جرّب كلمة بحث أخرى أو امسح البحث لرؤية كل السجل." : "Try another search term or clear the search to see your full history.")
          }
          className="py-10"
        />
      ) : (
        <div className="space-y-3">
          {displayedSummaries.map((summary) => {
            const isCopied = copiedId === summary.id;

            return (
              <article
                key={summary.id}
                data-testid="history-row"
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--primary)]"
              >
                <div className="flex items-start gap-3">
                  <label className="pt-1">
                    <input
                      type="checkbox"
                      checked={selectedIdSet.has(summary.id)}
                      onChange={() => toggleSelection(summary.id)}
                      data-testid="history-select-row"
                      aria-label={locale === "ar" ? "تحديد هذا الملخص" : "Select this summary"}
                      className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                    />
                  </label>
                  <Link
                    href={`/history/${summary.id}`}
                    data-testid="history-row-link"
                    className="block min-w-0 flex-1"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-[var(--text-lg)] font-semibold text-[var(--foreground)]">
                            {summary.title || (locale === "ar" ? "ملخص بدون عنوان" : "Untitled Summary")}
                          </h2>
                          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--text-strong)]">
                            {LANG_LABEL[summary.lang_detected] ?? summary.lang_detected.toUpperCase()}
                          </span>
                          {summary.source_kind === "zip" && (
                            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--primary)]">
                              ZIP
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[var(--text-sm)] text-[var(--muted-foreground)]">
                          {formatDate(summary.created_at, locale, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        {summary.group_name && (
                          <span className="mt-2 inline-flex items-center rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                            {summary.group_name}
                          </span>
                        )}
                        {summary.source_kind === "zip" && (
                          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                            {[
                              getRangeLabel(summary.source_range, locale),
                              typeof summary.new_messages_count === "number"
                                ? locale === "ar"
                                  ? `${formatNumber(summary.new_messages_count)} رسالة جديدة`
                                  : `${formatNumber(summary.new_messages_count)} new messages`
                                : null,
                            ].filter(Boolean).join(" • ")}
                          </p>
                        )}
                        <p className="mt-2 line-clamp-2 text-[var(--text-sm)] leading-6 text-[var(--muted-foreground)]">
                          {summary.tldr}
                        </p>
                        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                          {locale === "ar"
                            ? `${formatNumber(summary.char_count)} حرف`
                            : `${formatNumber(summary.char_count)} characters`}
                        </p>
                      </div>
                      <ChevronRight
                        className={cn(
                          "mt-0.5 h-5 w-5 shrink-0 text-[var(--muted-foreground)]",
                          isRtl && "rotate-180"
                        )}
                      />
                    </div>
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleShare(summary.id)}
                  >
                    {isCopied ? <Check className="h-4 w-4 text-[var(--primary)]" /> : <Link2 className="h-4 w-4" />}
                    {isCopied ? (locale === "ar" ? "تم النسخ" : "Copied") : (locale === "ar" ? "نسخ الرابط" : "Copy link")}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog([summary.id])}
                    data-testid="history-delete-btn"
                    className="text-[var(--destructive)] hover:bg-[var(--destructive-soft)] hover:text-[var(--destructive)]"
                  >
                    <Trash2 className="h-4 w-4" />
                    {locale === "ar" ? "حذف" : "Delete"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog
        open={pendingDeleteIds !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setPendingDeleteIds(null);
          }
        }}
        title={
          deleteTargetCount > 1
            ? locale === "ar"
              ? "حذف الملخصات المحددة"
              : "Delete selected summaries"
            : locale === "ar"
              ? "حذف الملخص"
              : "Delete summary"
        }
      >
        <div dir={isRtl ? "rtl" : "ltr"} lang={locale} className={cn("space-y-4", isRtl && "font-arabic text-right")}>
          <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
            {deleteTargetCount > 1
              ? locale === "ar"
                ? `سيتم حذف ${formatNumber(deleteTargetCount)} ملخصات نهائيًا من السجل. هل تريد المتابعة؟`
                : `This will permanently delete ${formatNumber(deleteTargetCount)} summaries from your history. Continue?`
              : locale === "ar"
                ? "سيتم حذف هذا الملخص نهائيًا من السجل. هل تريد المتابعة؟"
                : "This will permanently delete this summary from your history. Continue?"}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDeleteIds(null)}
              disabled={isDeleting}
            >
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete(pendingDeleteIds ?? [])}
              disabled={isDeleting}
              data-testid="history-delete-confirm"
              className="whitespace-normal"
            >
              {isDeleting
                ? locale === "ar"
                  ? "جارٍ الحذف..."
                  : "Deleting..."
                : locale === "ar"
                  ? "نعم، احذف"
                  : "Yes, delete"}
            </Button>
          </div>
        </div>
      </Dialog>

      {clientTotalCount > 0 && totalPages > 1 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
            {locale === "ar"
              ? `صفحة ${formatNumber(currentPage)} من ${formatNumber(totalPages)}`
              : `Page ${formatNumber(currentPage)} of ${formatNumber(totalPages)}`}
          </p>

          <div className="flex items-center gap-2">
            {currentPage > 1 && pathname ? (
              <Link
                href={buildHistoryHref(pathname, query, currentPage - 1)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {locale === "ar" ? "السابق" : "Previous"}
              </Link>
            ) : (
              <Button type="button" variant="outline" size="sm" disabled>
                {locale === "ar" ? "السابق" : "Previous"}
              </Button>
            )}

            {currentPage < totalPages && pathname ? (
              <Link
                href={buildHistoryHref(pathname, query, currentPage + 1)}
                className={buttonVariants({ size: "sm" })}
              >
                {locale === "ar" ? "التالي" : "Next"}
              </Link>
            ) : (
              <Button type="button" size="sm" disabled>
                {locale === "ar" ? "التالي" : "Next"}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
