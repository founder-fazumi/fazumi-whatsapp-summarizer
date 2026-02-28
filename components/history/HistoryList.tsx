"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Clock, FileText } from "lucide-react";
import type { SummaryRow } from "@/app/history/page";
import { useLang } from "@/lib/context/LangContext";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  const { locale } = useLang();
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? summaries.filter(
        (s) =>
          s.title.toLowerCase().includes(query.toLowerCase()) ||
          s.tldr.toLowerCase().includes(query.toLowerCase())
      )
    : summaries;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={locale === "ar" ? "ابحث في الملخصات…" : "Search summaries…"}
          className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] py-2.5 pl-9 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
        />
      </div>

      {/* Count */}
      <p className="text-xs text-[var(--muted-foreground)]">
        {locale === "ar"
          ? `${formatNumber(filtered.length)} ${filtered.length === 1 ? "ملخص" : "ملخصات"}${query ? ` تطابق "${query}"` : ""}`
          : `${formatNumber(filtered.length)} ${filtered.length === 1 ? "summary" : "summaries"}${query ? ` matching "${query}"` : ""}`}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
          {locale === "ar" ? "لا توجد نتائج." : "No results."}
        </p>
      ) : (
        <div className="divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/history/${s.id}`}
              className={cn(
                "flex items-start gap-3 px-4 py-3.5 transition-colors",
                "hover:bg-[var(--bg-2)] first:rounded-t-[var(--radius-lg)] last:rounded-b-[var(--radius-lg)]"
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 mt-0.5">
                <FileText className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">{s.title}</p>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)] line-clamp-1">{s.tldr}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-[var(--muted-foreground)]">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {relativeTime(s.created_at, locale)}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full border border-[var(--border)] px-1.5 py-px font-medium">
                    {LANG_LABEL[s.lang_detected] ?? s.lang_detected.toUpperCase()}
                  </span>
                  <span>
                    {formatNumber(s.char_count / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    {locale === "ar" ? " ألف حرف" : "k chars"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
