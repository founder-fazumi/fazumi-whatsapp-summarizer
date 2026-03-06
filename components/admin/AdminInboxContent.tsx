"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Inbox, MessageSquareHeart, RefreshCcw, Search, Tags } from "lucide-react";
import type {
  AdminFeedbackRow,
  AdminInboxData,
  AdminInboxPriority,
  AdminSupportRequestRow,
  AdminSupportStatus,
} from "@/lib/admin/types";
import { formatDate, formatNumber } from "@/lib/format";
import { useLang } from "@/lib/context/LangContext";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type InboxTab = "feedback" | "support";
type InboxItem = AdminFeedbackRow | AdminSupportRequestRow;

async function fetchInbox() {
  const response = await fetch("/api/admin/inbox", { cache: "no-store" });
  const payload = (await response.json()) as { ok: boolean; data?: AdminInboxData; error?: string };

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Could not load inbox.");
  }

  return payload.data;
}

async function saveInbox(payload: {
  kind: InboxTab;
  id: string;
  status: AdminSupportStatus;
  priority: AdminInboxPriority;
  tags: string[];
  adminNotes: string | null;
}) {
  const response = await fetch("/api/admin/inbox", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as { ok: boolean; error?: string };

  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "Could not update inbox item.");
  }
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

function inWindow(value: string, filter: "all" | "today" | "7d" | "30d") {
  if (filter === "all") return true;
  const ms = filter === "today" ? 86_400_000 : filter === "7d" ? 604_800_000 : 2_592_000_000;
  return new Date(value).getTime() >= Date.now() - ms;
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
  const [selected, setSelected] = useState<InboxItem | null>(null);
  const [statusDraft, setStatusDraft] = useState<AdminSupportStatus>("new");
  const [priorityDraft, setPriorityDraft] = useState<AdminInboxPriority>("normal");
  const [tagsDraft, setTagsDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = useDeferredValue(search.trim().toLowerCase());

  useEffect(() => {
    if (!selected) return;
    setStatusDraft(selected.status as AdminSupportStatus);
    setPriorityDraft(selected.priority);
    setTagsDraft(selected.tags.join(", "));
    setNotesDraft(selected.adminNotes ?? "");
  }, [selected]);

  const section = tab === "feedback" ? data.feedback : data.support;
  const items = tab === "feedback" ? data.feedback.items : data.support.items;
  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (statusFilter !== "all" && item.status !== statusFilter) return false;
        if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;
        if (localeFilter !== "all" && item.locale !== localeFilter) return false;
        if (tagFilter !== "all" && !item.tags.includes(tagFilter)) return false;
        if (!inWindow(item.createdAt, dateFilter)) return false;
        if (!query) return true;
        return [item.subject, item.message, contactValue(item), item.tags.join(" "), isFeedback(item) ? item.type : ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      }),
    [dateFilter, items, localeFilter, priorityFilter, query, statusFilter, tagFilter]
  );

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const next = await fetchInbox();
      setData(next);
      if (selected) {
        const nextItem = [...next.feedback.items, ...next.support.items].find((item) => item.id === selected.id) ?? null;
        setSelected(nextItem);
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not refresh inbox.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await saveInbox({
        kind: isFeedback(selected) ? "feedback" : "support",
        id: selected.id,
        status: statusDraft,
        priority: priorityDraft,
        tags: tagsDraft.split(",").map((tag) => tag.trim()).filter(Boolean),
        adminNotes: notesDraft.trim() || null,
      });
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save inbox item.");
    } finally {
      setSaving(false);
    }
  }

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
          <Button type="button" variant="outline" size="sm" onClick={() => startTransition(() => void refresh())} disabled={refreshing}>
            <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? (locale === "ar" ? "جارٍ التحديث..." : "Refreshing...") : locale === "ar" ? "تحديث" : "Refresh"}
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
                  tab === item.key ? "border-[var(--primary)] bg-[var(--primary)]/8 text-[var(--text-strong)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)]"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
                <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs text-[var(--text-strong)]">{formatNumber(item.count)}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,0.8fr))]">
            <div className="relative md:col-span-2 xl:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input id="admin-inbox-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={locale === "ar" ? "ابحث في الرسائل" : "Search the inbox"} className="pl-10" />
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | AdminSupportStatus)} className="h-11 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm">
              <option value="all">{locale === "ar" ? "كل الحالات" : "All statuses"}</option>
              <option value="new">{statusLabel("new", locale)}</option>
              <option value="in_progress">{statusLabel("in_progress", locale)}</option>
              <option value="resolved">{statusLabel("resolved", locale)}</option>
              <option value="closed">{statusLabel("closed", locale)}</option>
            </select>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as "all" | AdminInboxPriority)} className="h-11 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm">
              <option value="all">{locale === "ar" ? "كل الأولويات" : "All priorities"}</option>
              <option value="low">{priorityLabel("low", locale)}</option>
              <option value="normal">{priorityLabel("normal", locale)}</option>
              <option value="high">{priorityLabel("high", locale)}</option>
              <option value="critical">{priorityLabel("critical", locale)}</option>
            </select>
            <select value={localeFilter} onChange={(event) => setLocaleFilter(event.target.value as "all" | "en" | "ar")} className="h-11 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm">
              <option value="all">{locale === "ar" ? "كل اللغات" : "All languages"}</option>
              <option value="en">EN</option>
              <option value="ar">AR</option>
            </select>
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as "all" | "today" | "7d" | "30d")} className="h-11 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm">
              <option value="all">{locale === "ar" ? "كل التواريخ" : "All dates"}</option>
              <option value="today">{locale === "ar" ? "اليوم" : "Today"}</option>
              <option value="7d">{locale === "ar" ? "آخر 7 أيام" : "Last 7d"}</option>
              <option value="30d">{locale === "ar" ? "آخر 30 يومًا" : "Last 30d"}</option>
            </select>
            <div className="relative">
              <Tags className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} className="h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-10 text-sm">
                <option value="all">{locale === "ar" ? "كل الوسوم" : "All tags"}</option>
                {section.tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] px-4 py-12 text-center text-sm text-[var(--muted-foreground)]">
            {locale === "ar" ? "لا توجد رسائل مطابقة لهذه الفلاتر." : "No inbox items match the current filters."}
          </div>
        ) : (
          filtered.map((item) => (
            <button key={item.id} type="button" onClick={() => setSelected(item)} className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--surface-elevated)]">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={badgeTone(item.status)}>{statusLabel(item.status, locale)}</Badge>
                <Badge variant="outline" className={badgeTone(item.priority)}>{priorityLabel(item.priority, locale)}</Badge>
                <span className="text-xs uppercase text-[var(--muted-foreground)]">{item.locale}</span>
                {isFeedback(item) ? <span className="text-xs capitalize text-[var(--muted-foreground)]">{item.type}</span> : null}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_10rem] md:items-start">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-strong)]">{item.subject}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.message.length > 180 ? `${item.message.slice(0, 179)}…` : item.message}</p>
                </div>
                <div className="text-sm text-[var(--muted-foreground)]">{contactValue(item)}</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  {formatDate(item.createdAt, locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] sm:max-w-xl">
          {selected ? (
            <>
              <SheetHeader className="border-b border-[var(--border)]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={badgeTone(selected.status)}>{statusLabel(selected.status, locale)}</Badge>
                  <Badge variant="outline" className={badgeTone(selected.priority)}>{priorityLabel(selected.priority, locale)}</Badge>
                </div>
                <SheetTitle className="pr-10">{selected.subject}</SheetTitle>
                <p className="text-sm text-[var(--muted-foreground)]">{formatDate(selected.createdAt, locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              </SheetHeader>
              <div className="space-y-6 p-6">
                <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--text-strong)]">{selected.message}</div>
                <div className="grid gap-3">
                  <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                    <div className="text-xs text-[var(--muted-foreground)]">{locale === "ar" ? "من" : "From"}</div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-sm text-[var(--text-strong)]">
                      <span>{contactValue(selected)}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void navigator.clipboard?.writeText(contactValue(selected))}><Copy className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  {selected.userId ? (
                    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
                      <div className="text-xs text-[var(--muted-foreground)]">{locale === "ar" ? "المستخدم" : "User"}</div>
                      <div className="mt-1 flex items-center justify-between gap-3 text-[var(--text-strong)]">
                        <span className="truncate">{selected.userId}</span>
                        <Link href={`/admin_dashboard/users?search=${encodeURIComponent(selected.userId)}`} className="text-[var(--primary)] hover:underline">{locale === "ar" ? "فتح" : "Open"}</Link>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="drawer-status" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{locale === "ar" ? "الحالة" : "Status"}</label>
                    <select id="drawer-status" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as AdminSupportStatus)} className="h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm">
                      <option value="new">{statusLabel("new", locale)}</option>
                      <option value="in_progress">{statusLabel("in_progress", locale)}</option>
                      <option value="resolved">{statusLabel("resolved", locale)}</option>
                      <option value="closed">{statusLabel("closed", locale)}</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="drawer-priority" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{locale === "ar" ? "الأولوية" : "Priority"}</label>
                    <select id="drawer-priority" value={priorityDraft} onChange={(event) => setPriorityDraft(event.target.value as AdminInboxPriority)} className="h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm">
                      <option value="low">{priorityLabel("low", locale)}</option>
                      <option value="normal">{priorityLabel("normal", locale)}</option>
                      <option value="high">{priorityLabel("high", locale)}</option>
                      <option value="critical">{priorityLabel("critical", locale)}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="drawer-tags" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{locale === "ar" ? "الوسوم" : "Tags"}</label>
                  <Input id="drawer-tags" value={tagsDraft} onChange={(event) => setTagsDraft(event.target.value)} placeholder="billing, mobile, vip" />
                </div>
                <div>
                  <label htmlFor="drawer-notes" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{locale === "ar" ? "ملاحظات الإدارة" : "Admin notes"}</label>
                  <Textarea id="drawer-notes" value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} className="min-h-32" placeholder={locale === "ar" ? "اكتب ملاحظات داخلية..." : "Write internal notes..."} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void handleSave()} disabled={saving}>{saving ? (locale === "ar" ? "جارٍ الحفظ..." : "Saving...") : locale === "ar" ? "حفظ" : "Save"}</Button>
                  <Button type="button" variant="outline" onClick={() => void navigator.clipboard?.writeText(selected.message)}><Copy className="h-4 w-4" />{locale === "ar" ? "نسخ الرسالة" : "Copy message"}</Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
