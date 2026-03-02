"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock, FileText, Inbox, Link2, Trash2 } from "lucide-react";
import type { SummaryRow } from "@/app/history/page";
import { useLang } from "@/lib/context/LangContext";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";

function relativeTime(iso: string, locale: "en" | "ar"): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return locale === "ar" ? "الآن" : "just now";
  if (m < 60) return locale === "ar" ? `قبل ${formatNumber(m)} دقيقة` : `${formatNumber(m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return locale === "ar" ? `قبل ${formatNumber(h)} ساعة` : `${formatNumber(h)}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return locale === "ar" ? `قبل ${formatNumber(d)} يوم` : `${formatNumber(d)}d ago`;
  return formatDate(iso, locale);
}

const LANG_LABEL: Record<string, string> = { en: "EN", ar: "AR" };

interface Props {
  summaries: SummaryRow[];
}

export function HistoryList({ summaries }: Props) {
  const router = useRouter();
  const { locale } = useLang();
  const [query, setQuery] = useState("");
  const [localSummaries, setLocalSummaries] = useState(summaries);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setLocalSummaries(summaries);
  }, [summaries]);

  const filtered = query.trim()
    ? localSummaries.filter(
        (s) =>
          s.title.toLowerCase().includes(query.toLowerCase()) ||
          s.tldr.toLowerCase().includes(query.toLowerCase())
      )
    : localSummaries;

  async function handleDelete(id: string) {
    setDeletingId(id);
    setActionError(null);
    const previousSummaries = localSummaries;
    setLocalSummaries((current) => current.filter((s) => s.id !== id));

    try {
      const response = await fetch(`/api/summaries/${id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Could not delete summary.");
      }

      router.refresh();
    } catch {
      setLocalSummaries(previousSummaries);
      setActionError(locale === "ar" ? "تعذر حذف الملخص. حاول مرة أخرى." : "Could not delete the summary. Try again.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  function handleShare(id: string) {
    const url = `${window.location.origin}/history/${id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 2000);
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    setActionError(null);
    const previousSummaries = localSummaries;
    setLocalSummaries([]);

    try {
      const response = await fetch("/api/summaries", { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Could not delete summaries.");
      }

      router.refresh();
    } catch {
      setLocalSummaries(previousSummaries);
      setActionError(locale === "ar" ? "تعذر حذف السجل. حاول مرة أخرى." : "Could not delete the history. Try again.");
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="status-destructive rounded-[var(--radius)] border px-3 py-2 text-xs">
          {actionError}
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={locale === "ar" ? "ابحث في الملخصات…" : "Search summaries…"}
          className="h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface-elevated)] py-2.5 pl-9 pr-4 text-sm text-[var(--foreground)] shadow-[var(--shadow-xs)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
        />
      </div>

      {/* Count + Delete all */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[var(--muted-foreground)]">
          {locale === "ar"
            ? `${formatNumber(filtered.length)} ${filtered.length === 1 ? "ملخص" : "ملخصات"}${query ? ` تطابق "${query}"` : ""}`
            : `${formatNumber(filtered.length)} ${filtered.length === 1 ? "summary" : "summaries"}${query ? ` matching "${query}"` : ""}`}
        </p>
        {localSummaries.length > 0 && (
          <button
            type="button"
            onClick={() => void handleDeleteAll()}
            disabled={deletingAll}
            data-testid="history-delete-all"
            className="text-xs text-[var(--destructive)] hover:underline underline-offset-4 disabled:opacity-50"
          >
            {locale === "ar" ? "حذف الكل" : "Delete all"}
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={locale === "ar" ? "لا يوجد شيء هنا بعد." : "Nothing here yet."}
          body={locale === "ar" ? "سيظهر سجلك هنا." : "Your history will appear here."}
          className="py-8"
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]">
          {filtered.map((s) => {
            const isConfirming = confirmDeleteId === s.id;
            const isDeleting = deletingId === s.id;
            const isCopied = copiedId === s.id;

            return (
              <div
                key={s.id}
                data-testid="history-row"
                className={cn(
                  "group relative flex items-start gap-3 border-b border-[var(--border)] px-4 py-4 transition-colors last:border-b-0",
                  "hover:bg-[var(--surface-muted)]"
                )}
              >
                {/* Full-row link for navigation (behind action buttons) */}
                <Link
                  href={`/history/${s.id}`}
                  data-testid="history-row-link"
                  className="absolute inset-0"
                  aria-label={s.title}
                  tabIndex={-1}
                />

                {/* Icon */}
                <div className="relative z-10 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary-soft)]">
                  <FileText className="h-4 w-4 text-[var(--primary)]" />
                </div>

                {/* Title + TL;DR */}
                <div className="relative z-10 min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">{s.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)] line-clamp-1">{s.tldr}</p>
                </div>

                {/* Metadata + actions */}
                <div className="relative z-10 flex shrink-0 flex-col items-end gap-1.5">
                  {/* Time */}
                  <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                    <Clock className="h-3 w-3" />
                    {relativeTime(s.created_at, locale)}
                  </div>

                  {/* Lang + chars + action buttons */}
                  <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-1.5 py-px font-medium">
                      {LANG_LABEL[s.lang_detected] ?? s.lang_detected.toUpperCase()}
                    </span>
                    <span>
                      {formatNumber(s.char_count / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      {locale === "ar" ? " ألف حرف" : "k chars"}
                    </span>

                    {/* Share button */}
                    <button
                      type="button"
                      onClick={() => handleShare(s.id)}
                      aria-label={locale === "ar" ? "نسخ الرابط" : "Copy link"}
                      title={locale === "ar" ? "نسخ الرابط" : "Copy link"}
                      className="rounded-full p-1 text-[var(--muted-foreground)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                    >
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-[var(--primary)]" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {/* Delete button */}
                    {!isConfirming ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(s.id)}
                        aria-label={locale === "ar" ? "حذف" : "Delete"}
                        title={locale === "ar" ? "حذف" : "Delete"}
                        className="rounded-full p-1 text-[var(--muted-foreground)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--surface-muted)] hover:text-[var(--destructive)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          {locale === "ar" ? "حذف؟" : "Delete?"}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleDelete(s.id)}
                          disabled={isDeleting}
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white bg-[var(--destructive)] hover:brightness-95 disabled:opacity-50"
                        >
                          {isDeleting
                            ? (locale === "ar" ? "…" : "…")
                            : (locale === "ar" ? "نعم" : "Yes")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[10px] hover:bg-[var(--surface-muted)]"
                        >
                          {locale === "ar" ? "لا" : "No"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
