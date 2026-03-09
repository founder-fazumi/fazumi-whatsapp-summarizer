"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Inbox, MessageSquareHeart, RefreshCcw, Search, Tags } from "lucide-react";
import type {
  AdminFeedbackRow,
  AdminInboxData,
  AdminInboxPriority,
  AdminSupportRequestRow,
  AdminSupportStatus,
} from "@/lib/admin/types";
import { formatDate, formatNumber } from "@/lib/format";
import { useLang } from "@/lib/context/LangContext";
import { AdminInboxItemPanel } from "@/components/admin/AdminInboxItemPanel";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type InboxTab = "feedback" | "support";
type InboxItem = AdminFeedbackRow | AdminSupportRequestRow;

async function fetchInbox(filters?: {
  tab?: string;
  status?: string;
  priority?: string;
  locale?: string;
  tag?: string;
  search?: string;
  dateWindow?: string;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.tab) params.set("tab", filters.tab);
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.priority && filters.priority !== "all") params.set("priority", filters.priority);
  if (filters?.locale && filters.locale !== "all") params.set("locale", filters.locale);
  if (filters?.tag && filters.tag !== "all") params.set("tag", filters.tag);
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  if (filters?.dateWindow && filters.dateWindow !== "all") params.set("dateWindow", filters.dateWindow);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));

  const response = await fetch(`/api/admin/inbox?${params.toString()}`, { cache: "no-store" });
  const payload = (await response.json()) as { ok: boolean; data?: AdminInboxData; error?: string };

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Could not load inbox.");
  }

  return payload.data;
}

function isFeedback(item: InboxItem): item is AdminFeedbackRow {
  return "type" in item;
}

function statusLabel(value: string, locale: "en" | "ar") {
  const copy: Record<string, { en: string; ar: string }> = {
    new: { en: "New", ar: "جديد" },
    in_progress: { en: "In progress", ar: "قيد المتابعة" },
    resolved: { en: "Resolved", ar: "تم الحل" },
    closed: { en: "Closed", ar: "مغلق" },
  };
  return copy[value]?.[locale] ?? value;
}

function priorityLabel(value: AdminInboxPriority, locale: "en" | "ar") {
  const copy: Record<AdminInboxPriority, { en: string; ar: string }> = {
    low: { en: "Low", ar: "منخفض" },
    normal: { en: "Normal", ar: "عادي" },
    high: { en: "High", ar: "مرتفع" },
    critical: { en: "Critical", ar: "حرج" },
  };
  return copy[value][locale];
}

function badgeTone(value: string) {
  if (value === "resolved") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
  if (value === "closed") return "border-slate-500/20 bg-slate-500/10 text-slate-700";
  if (value === "in_progress") return "border-amber-500/20 bg-amber-500/10 text-amber-700";
  if (value === "critical") return "border-[var(--destructive)]/20 bg-[var(--destructive)]/10 text-[var(--destructive)]";
  if (value === "high") return "border-amber-500/20 bg-amber-500/10 text-amber-700";
  return "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-strong)]";
}

function contactValue(item: InboxItem) {
  return item.email ?? item.phone ?? item.userId ?? "Anonymous";
}

export function AdminInboxContent({ initialData }: { initialData: AdminInboxData }) {
  const { locale } = useLang();
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get("tab") === "support" ? "support" : "feedback";
  const [tab, setTab] = useState<InboxTab>(initialTab);
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminSupportStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | AdminInboxPriority>("all");
  const [localeFilter, setLocaleFilter] = useState<"all" | "en" | "ar">("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7d" | "30d">("30d");
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [selectedKind, setSelectedKind] = useState<InboxTab>("feedback");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = useDeferredValue(search.trim().toLowerCase());

  const section = tab === "feedback" ? data.feedback : data.support;
  const filtered = section.items;

  function buildFilters() {
    return {
      tab,
      status: statusFilter,
      priority: priorityFilter,
      locale: localeFilter,
      tag: tagFilter,
      search: query || undefined,
      dateWindow: dateFilter,
      page: 1,
      pageSize: 50,
    };
  }

  async function refresh() {
    setRefreshing(true);
    setError(null);

    try {
      const next = await fetchInbox(buildFilters());
      setData(next);

      if (selectedItem) {
        const nextSection = selectedKind === "feedback" ? next.feedback.items : next.support.items;
        const nextItem = nextSection.find((item) => item.id === selectedItem.id) ?? null;
        setSelectedItem(nextItem);
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not refresh inbox.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (selectedItem && selectedKind !== tab) {
      setSelectedItem(null);
    }
  }, [selectedItem, selectedKind, tab]);

  // Re-fetch from server whenever any filter changes. query is useDeferredValue so search debounces naturally.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { startTransition(() => { void refresh(); }); }, [tab, statusFilter, priorityFilter, localeFilter, tagFilter, dateFilter, query]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={locale === "ar" ? "صندوق الإدارة" : "Admin inbox"}
        description={
          locale === "ar"
            ? `الملاحظات والدعم في مكان واحد. آخر تحديث ${formatDate(data.generatedAt, locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`
            : `Feedback and support in one place. Last updated ${formatDate(data.generatedAt, locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`
        }
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => startTransition(() => void refresh())}
            disabled={refreshing}
          >
            <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {refreshing
              ? locale === "ar"
                ? "جارٍ التحديث..."
                : "Refreshing..."
              : locale === "ar"
              ? "تحديث"
              : "Refresh"}
          </Button>
        }
      />

      {error ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: locale === "ar" ? "الإجمالي" : "Total", value: section.total, detail: locale === "ar" ? "كل الرسائل" : "All items" },
          { label: locale === "ar" ? "جديد" : "New", value: section.newCount, detail: locale === "ar" ? "بانتظار المراجعة" : "Waiting for first review" },
          { label: locale === "ar" ? "مفتوح" : "Open", value: section.openCount, detail: locale === "ar" ? "جديد أو قيد المتابعة" : "New or in progress" },
          { label: locale === "ar" ? "مرتفع" : "High priority", value: section.highPriorityCount, detail: locale === "ar" ? "مرتفع أو حرج" : "High or critical" },
        ].map((card) => (
          <div key={card.label} className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <div className="text-sm text-[var(--muted-foreground)]">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{formatNumber(card.value)}</div>
            <div className="mt-2 text-xs text-[var(--muted-foreground)]">{card.detail}</div>
          </div>
        ))}
      </div>

      <Card className="bg-[var(--surface-elevated)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "feedback" as const, icon: MessageSquareHeart, label: locale === "ar" ? "الملاحظات" : "Feedback", count: data.feedback.newCount },
              { key: "support" as const, icon: Inbox, label: locale === "ar" ? "الدعم" : "Support", count: data.support.newCount },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-[var(--radius-xl)] border px-4 py-2 text-sm font-medium",
                  tab === item.key
                    ? "border-[var(--primary)] bg-[var(--primary)]/8 text-[var(--text-strong)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)]"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
                <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs text-[var(--text-strong)]">
                  {formatNumber(item.count)}
                </span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,0.8fr))]">
            <div className="relative md:col-span-2 xl:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                id="admin-inbox-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={locale === "ar" ? "ابحث في الرسائل" : "Search the inbox"}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | AdminSupportStatus)}
              className="h-11 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm"
            >
              <option value="all">{locale === "ar" ? "كل الحالات" : "All statuses"}</option>
              <option value="new">{statusLabel("new", locale)}</option>
              <option value="in_progress">{statusLabel("in_progress", locale)}</option>
              <option value="resolved">{statusLabel("resolved", locale)}</option>
              <option value="closed">{statusLabel("closed", locale)}</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as "all" | AdminInboxPriority)}
              className="h-11 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm"
            >
              <option value="all">{locale === "ar" ? "كل الأولويات" : "All priorities"}</option>
              <option value="low">{priorityLabel("low", locale)}</option>
              <option value="normal">{priorityLabel("normal", locale)}</option>
              <option value="high">{priorityLabel("high", locale)}</option>
              <option value="critical">{priorityLabel("critical", locale)}</option>
            </select>
            <select
              value={localeFilter}
              onChange={(event) => setLocaleFilter(event.target.value as "all" | "en" | "ar")}
              className="h-11 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm"
            >
              <option value="all">{locale === "ar" ? "كل اللغات" : "All languages"}</option>
              <option value="en">EN</option>
              <option value="ar">AR</option>
            </select>
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as "all" | "today" | "7d" | "30d")}
              className="h-11 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm"
            >
              <option value="all">{locale === "ar" ? "كل التواريخ" : "All dates"}</option>
              <option value="today">{locale === "ar" ? "اليوم" : "Today"}</option>
              <option value="7d">{locale === "ar" ? "آخر 7 أيام" : "Last 7d"}</option>
              <option value="30d">{locale === "ar" ? "آخر 30 يومًا" : "Last 30d"}</option>
            </select>
            <div className="relative">
              <Tags className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <select
                value={tagFilter}
                onChange={(event) => setTagFilter(event.target.value)}
                className="h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-10 text-sm"
              >
                <option value="all">{locale === "ar" ? "كل الوسوم" : "All tags"}</option>
                {section.tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className={cn("min-w-0 flex-1", selectedItem && "hidden lg:block")}>
          <div className="grid gap-4">
            {filtered.length === 0 ? (
              <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] px-4 py-12 text-center text-sm text-[var(--muted-foreground)]">
                {locale === "ar" ? "لا توجد رسائل مطابقة لهذه الفلاتر." : "No inbox items match the current filters."}
              </div>
            ) : (
              filtered.map((item) => {
                const active = selectedKind === tab && selectedItem?.id === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedItem(item);
                      setSelectedKind(tab);
                    }}
                    className={cn(
                      "rounded-[var(--radius-xl)] border bg-[var(--surface)] p-4 text-left transition-colors",
                      active
                        ? "border-[var(--primary)] bg-[var(--surface-elevated)]"
                        : "border-[var(--border)] hover:border-[var(--primary)]/30 hover:bg-[var(--surface-elevated)]"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={badgeTone(item.status)}>
                        {statusLabel(item.status, locale)}
                      </Badge>
                      <Badge variant="outline" className={badgeTone(item.priority)}>
                        {priorityLabel(item.priority, locale)}
                      </Badge>
                      <span className="text-xs uppercase text-[var(--muted-foreground)]">{item.locale}</span>
                      {isFeedback(item) ? (
                        <span className="text-xs capitalize text-[var(--muted-foreground)]">{item.type}</span>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_10rem] md:items-start">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-strong)]">{item.subject}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                          {item.message.length > 180 ? `${item.message.slice(0, 179)}…` : item.message}
                        </p>
                      </div>
                      <div className="text-sm text-[var(--muted-foreground)]">{contactValue(item)}</div>
                      <div className="text-sm text-[var(--muted-foreground)]">
                        {formatDate(item.createdAt, locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {selectedItem ? (
          <div className="w-full shrink-0 lg:w-[360px]">
            <AdminInboxItemPanel
              item={selectedItem}
              kind={selectedKind}
              locale={locale}
              onClose={() => setSelectedItem(null)}
              onSave={async (updates) => {
                try {
                  setError(null);

                  const response = await fetch("/api/admin/inbox", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      kind: selectedKind,
                      id: selectedItem.id,
                      ...updates,
                    }),
                  });
                  const payload = (await response.json()) as { ok: boolean; error?: string };

                  if (!response.ok || !payload.ok) {
                    throw new Error(payload.error ?? "Could not update inbox item.");
                  }

                  await refresh();
                } catch (saveError) {
                  const message = saveError instanceof Error ? saveError.message : "Could not save inbox item.";
                  setError(message);
                  throw saveError;
                }
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
