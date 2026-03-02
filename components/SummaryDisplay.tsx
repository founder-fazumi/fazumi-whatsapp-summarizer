"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ThumbsUp, ThumbsDown, CalendarPlus, ListChecks, Download, Zap,
  AlignLeft, Calendar, Users, Link2, HelpCircle, ShieldCheck, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SummaryResult } from "@/lib/ai/summarize";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { parseDateFromLabel } from "@/lib/dashboard-insights";
import { formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type OutputLang = "en" | "ar";
type ActionMode = "disabled" | "gated" | "coming-soon" | "active";
type ActionKey = "calendar" | "todo" | "export";

const TODOS_CHANGED_EVENT = "fazumi-todos-changed";

const SECTION_META: Record<
  string,
  { en: string; ar: string; icon: LucideIcon }
> = {
  tldr:             { en: "TL;DR",                    ar: "الخلاصة",               icon: AlignLeft   },
  important_dates:  { en: "Important Dates",           ar: "المواعيد المهمة",       icon: Calendar    },
  action_items:     { en: "Action Items / To-Do",      ar: "الإجراءات المطلوبة",    icon: ListChecks  },
  people_classes:   { en: "People / Classes",          ar: "الأشخاص / المواد",      icon: Users       },
  links:            { en: "Links & Attachments",       ar: "الروابط والمرفقات",     icon: Link2       },
  questions:        { en: "Questions to Ask",          ar: "أسئلة للمعلم / المدرسة", icon: HelpCircle },
};

const SECTION_ORDER = [
  "tldr",
  "important_dates",
  "action_items",
  "people_classes",
  "links",
  "questions",
] as const;

type SectionKey = (typeof SECTION_ORDER)[number];

const EXPORT_HEADINGS: Record<OutputLang, Record<SectionKey, string>> = {
  en: {
    tldr: "TL;DR",
    important_dates: "Important Dates",
    action_items: "Action Items",
    people_classes: "People / Classes",
    links: "Links",
    questions: "Questions",
  },
  ar: {
    tldr: "الخلاصة",
    important_dates: "المواعيد المهمة",
    action_items: "المهام المطلوبة",
    people_classes: "الأشخاص / المواد",
    links: "الروابط",
    questions: "الأسئلة",
  },
};

const EXPORT_DIGIT_MAP: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

const UI_COPY = {
  en: {
    latestSummary: "Latest Summary",
    justNow: "Just now",
    chars: "chars",
    addToCalendar: "Add to Calendar",
    addToTodo: "Add to To-Do",
    export: "Export",
    helpful: "Was this summary helpful?",
    noStorage: "No chat text was stored — only this summary.",
    comingSoon: "Coming soon",
    subscribeTitle: "Subscribe to use this feature",
    subscribeBody: "Upgrade to unlock calendar, to-do, and export actions from your summaries.",
    upgradeCta: "View plans",
    later: "Maybe later",
    empty: "empty",
    nothingMentioned: "Nothing mentioned",
    soonTitle: "Feature coming soon",
    soonBody: "This action is reserved for paid plans and is still being finished.",
    calendarEmptyTitle: "No calendar-ready dates",
    calendarEmptyBody: "This summary does not include any dates I can turn into a calendar file yet.",
    todoEmptyTitle: "No action items found",
    todoEmptyBody: "This summary does not include any to-do items yet.",
    actionErrorTitle: "Could not complete this action",
    actionErrorBody: "Please try again in a moment.",
    close: "Close",
  },
  ar: {
    latestSummary: "أحدث ملخص",
    justNow: "الآن",
    chars: "حرفًا",
    addToCalendar: "أضف إلى التقويم",
    addToTodo: "أضف إلى المهام",
    export: "تصدير",
    helpful: "هل كان هذا الملخص مفيدًا؟",
    noStorage: "لم يتم حفظ نص المحادثة، بل هذا الملخص فقط.",
    comingSoon: "قريبًا",
    subscribeTitle: "اشترك لاستخدام هذه الميزة",
    subscribeBody: "قم بالترقية لفتح ميزات التقويم والمهام والتصدير من الملخص.",
    upgradeCta: "عرض الخطط",
    later: "لاحقًا",
    empty: "فارغ",
    nothingMentioned: "لا يوجد شيء مذكور",
    soonTitle: "الميزة قيد الإعداد",
    soonBody: "هذه الميزة مخصصة للخطط المدفوعة وما زالت قيد الإكمال.",
    calendarEmptyTitle: "لا توجد تواريخ جاهزة للتقويم",
    calendarEmptyBody: "لا يحتوي هذا الملخص على تواريخ أستطيع تحويلها إلى ملف تقويم بعد.",
    todoEmptyTitle: "لا توجد مهام",
    todoEmptyBody: "لا يحتوي هذا الملخص على عناصر مهام بعد.",
    actionErrorTitle: "تعذر إكمال هذا الإجراء",
    actionErrorBody: "حاول مرة أخرى بعد قليل.",
    close: "إغلاق",
  },
} as const;

const ACTIONS = [
  { key: "calendar", icon: CalendarPlus },
  { key: "todo", icon: ListChecks },
  { key: "export", icon: Download },
] as const;

function normalizeExportDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (char) => EXPORT_DIGIT_MAP[char] ?? char);
}

function buildPlainTextExport(summary: SummaryResult, outputLang: OutputLang, emptyLabel: string): string {
  return normalizeExportDigits(
    SECTION_ORDER.map((sectionKey) => {
      const heading = EXPORT_HEADINGS[outputLang][sectionKey];
      const value = summary[sectionKey];
      const lines =
        sectionKey === "tldr"
          ? [typeof value === "string" && value.trim() ? value.trim() : emptyLabel]
          : Array.isArray(value)
            ? value
                .map((item) => item.trim())
                .filter(Boolean)
                .map((item) => `• ${item}`)
            : [];

      const sectionLines = lines.length > 0
        ? lines
            : [emptyLabel];

      return [heading, "-".repeat(Math.max(5, heading.length)), ...sectionLines, ""].join("\n");
    }).join("\n").trim()
  );
}

function downloadSummaryExport(contents: string) {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fazumi-summary-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcsDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatIcsTimestamp(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  const hours = String(value.getUTCHours()).padStart(2, "0");
  const minutes = String(value.getUTCMinutes()).padStart(2, "0");
  const seconds = String(value.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function buildCalendarExport(summary: SummaryResult): string | null {
  const now = new Date();
  const events = summary.important_dates
    .map((label, index) => {
      const parsed = parseDateFromLabel(label, now);
      if (!parsed) {
        return null;
      }

      const start = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);

      return [
        "BEGIN:VEVENT",
        `UID:${formatIcsDate(start)}-${index}@fazumi.app`,
        `DTSTAMP:${formatIcsTimestamp(now)}`,
        `DTSTART;VALUE=DATE:${formatIcsDate(start)}`,
        `DTEND;VALUE=DATE:${formatIcsDate(end)}`,
        `SUMMARY:${escapeIcsText(label)}`,
        `DESCRIPTION:${escapeIcsText(summary.tldr)}`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .filter((event): event is string => Boolean(event));

  if (events.length === 0) {
    return null;
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fazumi//Summary Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadCalendarExport(contents: string) {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fazumi-summary-${new Date().toISOString().slice(0, 10)}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function normalizeTodoLabel(value: string): string {
  return value.trim().toLowerCase();
}

function SectionBlock({
  sectionKey,
  summary,
  outputLang,
}: {
  sectionKey: SectionKey;
  summary: SummaryResult;
  outputLang: OutputLang;
}) {
  const meta = SECTION_META[sectionKey];
  const label = meta[outputLang];
  const isRtl = outputLang === "ar";
  const copy = UI_COPY[outputLang];
  const value = summary[sectionKey];

  const isEmpty =
    sectionKey === "tldr"
      ? !value || String(value).trim() === ""
      : !Array.isArray(value) || value.length === 0;

  return (
    <section
      dir={isRtl ? "rtl" : "ltr"}
      lang={isRtl ? "ar" : "en"}
      className={cn("px-4 py-4 sm:px-5", isRtl && "font-arabic text-right")}
    >
      <div
        className={cn(
          "mb-3 flex items-center gap-2 text-[11px] font-semibold text-[var(--muted-foreground)]",
          isRtl && "flex-row-reverse"
        )}
      >
        {(() => {
          const Icon = meta.icon;
          return <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />;
        })()}
        <span>{label}</span>
        {isEmpty && (
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
            {copy.empty}
          </span>
        )}
      </div>

      {isEmpty ? (
        <p className="text-sm italic text-[var(--muted-foreground)]">
          {copy.nothingMentioned}
        </p>
      ) : sectionKey === "tldr" ? (
        <p className="text-sm leading-7 text-[var(--card-foreground)]">
          {String(value)}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {(value as string[]).map((item, i) => (
            <li
              key={i}
              className={cn(
                "flex gap-2.5 text-sm text-[var(--card-foreground)]",
                isRtl && "flex-row-reverse text-right"
              )}
            >
              <span className="mt-[0.45rem] shrink-0 text-[10px] leading-none text-[var(--primary)]">●</span>
              <span className="leading-7">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface SummaryDisplayProps {
  summary: SummaryResult;
  outputLang: OutputLang;
  actionMode?: ActionMode;
  upgradeHref?: string;
}

export function SummaryDisplay({
  summary,
  outputLang,
  actionMode = "disabled",
  upgradeHref = "/pricing",
}: SummaryDisplayProps) {
  const router = useRouter();
  const [helpful, setHelpful] = useState<"up" | "down" | null>(null);
  const [dialogVariant, setDialogVariant] = useState<"upgrade" | "soon" | null>(null);
  const [infoDialog, setInfoDialog] = useState<{ title: string; body: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<"fb" | null>(null);
  const copy = UI_COPY[outputLang];
  const isRtl = outputLang === "ar";
  const formattedCharCount = formatNumber(summary.char_count);

  async function handleActionClick(actionKey: ActionKey) {
    if (actionKey !== "export") {
      setShowSharePanel(false);
    }

    if (actionMode === "gated") {
      setInfoDialog(null);
      setDialogVariant("upgrade");
      return;
    }

    if (actionMode === "coming-soon" && actionKey === "export") {
      setShowSharePanel(true);
      return;
    }

    if (actionMode === "coming-soon") {
      setInfoDialog(null);
      setDialogVariant("soon");
      return;
    }

    if (actionMode !== "active") {
      return;
    }

    if (actionKey === "export") {
      setShowSharePanel(true);
      return;
    }

    if (actionKey === "calendar") {
      const calendarExport = buildCalendarExport(summary);

      if (!calendarExport) {
        setDialogVariant(null);
        setInfoDialog({
          title: copy.calendarEmptyTitle,
          body: copy.calendarEmptyBody,
        });
        return;
      }

      downloadCalendarExport(calendarExport);
      return;
    }

    const actionItems = summary.action_items
      .map((item) => item.trim())
      .filter(Boolean);

    if (actionItems.length === 0) {
      setDialogVariant(null);
      setInfoDialog({
        title: copy.todoEmptyTitle,
        body: copy.todoEmptyBody,
      });
      return;
    }

    let supabase: ReturnType<typeof createClient>;

    try {
      supabase = createClient();
    } catch {
      setDialogVariant(null);
      setInfoDialog({
        title: copy.actionErrorTitle,
        body: copy.actionErrorBody,
      });
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setInfoDialog(null);
        setDialogVariant("upgrade");
        return;
      }

      setPendingAction("todo");

      const { data: existingItems, error: existingError } = await supabase
        .from("user_todos")
        .select("label, sort_order")
        .eq("user_id", user.id);

      if (existingError) {
        throw existingError;
      }

      const existingLabels = new Set(
        ((existingItems ?? []) as { label: string; sort_order: number }[]).map((item) => normalizeTodoLabel(item.label))
      );
      const nextSortOrder = ((existingItems ?? []) as { label: string; sort_order: number }[])
        .reduce((highest, item) => Math.max(highest, item.sort_order), -1) + 1;
      const rows = actionItems
        .filter((label) => !existingLabels.has(normalizeTodoLabel(label)))
        .map((label, index) => ({
          user_id: user.id,
          label,
          source: "summary" as const,
          sort_order: nextSortOrder + index,
          done: false,
        }));

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from("user_todos").insert(rows);

        if (insertError) {
          throw insertError;
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(TODOS_CHANGED_EVENT));
      }

      router.push("/todo");
    } catch {
      setDialogVariant(null);
      setInfoDialog({
        title: copy.actionErrorTitle,
        body: copy.actionErrorBody,
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      lang={isRtl ? "ar" : "en"}
      className={cn("space-y-3", isRtl && "font-arabic text-right")}
    >
      <Card className="overflow-hidden bg-[var(--surface-elevated)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-muted)]/60 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              {copy.latestSummary}
            </h2>
            <span className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--primary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
              {copy.justNow}
            </span>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">
            {formattedCharCount} {copy.chars}
          </span>
        </div>

        <div className="border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map(({ key, icon: Icon }) => {
              const label =
                key === "calendar"
                  ? copy.addToCalendar
                  : key === "todo"
                    ? copy.addToTodo
                    : copy.export;

              return (
                <button
                  key={key}
                  type="button"
                  data-testid={`summary-action-${key}`}
                  onClick={() => {
                    void handleActionClick(key);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={actionMode === "disabled" || pendingAction !== null}
                  title={actionMode === "disabled" ? copy.comingSoon : undefined}
                >
                  <Icon className="h-3.5 w-3.5 text-[var(--primary)]" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {showSharePanel && (() => {
          const exportText = buildPlainTextExport(summary, outputLang, copy.nothingMentioned);
          const short = exportText.slice(0, 1500);
          const waUrl = `https://wa.me/?text=${encodeURIComponent(short)}`;
          const tgUrl = `https://t.me/share/url?text=${encodeURIComponent(short)}`;
          const isTruncated = exportText.length > 1500;
          const truncatedCount = formatNumber(1500);
          const truncatedNote =
            outputLang === "ar"
              ? `يتم إرسال أول ${truncatedCount} حرف`
              : `Only the first ${truncatedCount} chars are sent`;

          function handleCopyFb() {
            navigator.clipboard.writeText(exportText).catch(() => {});
            setCopiedTarget("fb");
            setTimeout(() => setCopiedTarget((curr) => (curr === "fb" ? null : curr)), 2000);
          }

          return (
            <div data-testid="summary-share-panel" className="border-b border-[var(--border)] bg-[var(--surface)]/60 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="summary-download-export"
                  onClick={() => downloadSummaryExport(exportText)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                >
                  <Download className="h-3.5 w-3.5 text-[var(--primary)]" />
                  {outputLang === "ar" ? "تحميل .txt" : "Download .txt"}
                </button>

                <button
                  type="button"
                  onClick={() => window.open(waUrl, "_blank", "noopener,noreferrer")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                >
                  {outputLang === "ar" ? "واتساب" : "WhatsApp"}
                </button>

                <button
                  type="button"
                  onClick={() => window.open(tgUrl, "_blank", "noopener,noreferrer")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                >
                  {outputLang === "ar" ? "تيليجرام" : "Telegram"}
                </button>

                <button
                  type="button"
                  onClick={handleCopyFb}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                >
                  {copiedTarget === "fb"
                    ? (outputLang === "ar" ? "تم النسخ ✓" : "Copied ✓")
                    : (outputLang === "ar" ? "نسخ للفيسبوك" : "Copy for Facebook")}
                </button>

                <button
                  type="button"
                  onClick={() => setShowSharePanel(false)}
                  className="ml-auto rounded-lg border border-transparent px-2 py-1 text-xs font-medium text-[var(--muted-foreground)] hover:border-[var(--border)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                  aria-label={outputLang === "ar" ? "إغلاق" : "Close share panel"}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {isTruncated && (
                <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                  {truncatedNote}
                </p>
              )}
            </div>
          );
        })()}

        <div className="divide-y divide-[var(--border)]">
          {SECTION_ORDER.map((key) => (
            <SectionBlock
              key={key}
              sectionKey={key}
              summary={summary}
              outputLang={outputLang}
            />
          ))}
        </div>
        <div className="border-t border-[var(--border)] bg-[var(--surface)]/60 px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-[var(--foreground)]">
              {copy.helpful}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setHelpful("up")}
                className={cn(
                  "rounded-full p-1.5 transition-colors",
                  helpful === "up"
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]"
                )}
                aria-label="Thumbs up"
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => setHelpful("down")}
                className={cn(
                  "rounded-full p-1.5 transition-colors",
                  helpful === "down"
                    ? "bg-[var(--destructive)] text-white"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--destructive-soft)] hover:text-[var(--destructive)]"
                )}
                aria-label="Thumbs down"
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
            {copy.noStorage}
          </p>
        </div>
      </Card>

      <Dialog
        open={dialogVariant !== null || infoDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogVariant(null);
            setInfoDialog(null);
          }
        }}
        title={infoDialog?.title ?? (dialogVariant === "upgrade" ? copy.subscribeTitle : copy.soonTitle)}
      >
        {infoDialog ? (
          <div
            dir={isRtl ? "rtl" : "ltr"}
            lang={isRtl ? "ar" : "en"}
            className={cn("space-y-4", isRtl && "font-arabic text-right")}
          >
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {infoDialog.body}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setInfoDialog(null)}
                className={cn(buttonVariants({ variant: "default" }))}
              >
                {copy.close}
              </button>
            </div>
          </div>
        ) : (
          <div
            dir={isRtl ? "rtl" : "ltr"}
            lang={isRtl ? "ar" : "en"}
            className={cn("space-y-4", isRtl && "font-arabic text-right")}
          >
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {dialogVariant === "upgrade" ? copy.subscribeBody : copy.soonBody}
            </p>
            <div className="flex flex-wrap gap-3">
              {dialogVariant === "upgrade" && (
                <Link
                  href={upgradeHref}
                  className={cn(buttonVariants({ variant: "default" }))}
                  onClick={() => setDialogVariant(null)}
                >
                  {copy.upgradeCta}
                </Link>
              )}
              <button
                type="button"
                onClick={() => setDialogVariant(null)}
                className={cn(buttonVariants({ variant: dialogVariant === "upgrade" ? "outline" : "default" }))}
              >
                {dialogVariant === "upgrade" ? copy.later : copy.close}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
