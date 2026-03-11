"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ThumbsUp, ThumbsDown, CalendarPlus, ListChecks, Download, Zap,
  AlignLeft, Calendar, Users, Link2, HelpCircle, ShieldCheck, X,
  AlertTriangle, MapPin, Clock as ClockIcon, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SummaryResult, ImportantDate } from "@/lib/ai/summarize";
import { StatusLine } from "@/components/summary/StatusLine";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { parseDateFromLabel } from "@/lib/dashboard-insights";
import { getClientHealthSnapshot, getTodoStorageMode } from "@/lib/feature-health";
import { formatNumber } from "@/lib/format";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { deriveActionCenter } from "@/lib/summary-action-center";
import { createClient } from "@/lib/supabase/client";
import { mergeLocalTodoLabels, normalizeTodoLabel } from "@/lib/todos/local";
import { paymentsComingSoon, withPaymentComingSoonLabel } from "@/lib/payments-ui";
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

const EXPORT_HEADING_EMOJIS: Record<SectionKey, string> = {
  tldr: "📝",
  important_dates: "📅",
  action_items: "✅",
  people_classes: "👥",
  links: "🔗",
  questions: "❓",
};

const DIR_RLM = "\u200F";
const DIR_LRM = "\u200E";
const DIR_RTL_ISOLATE = "\u2067";
const DIR_LTR_ISOLATE = "\u2066";
const DIR_POP_ISOLATE = "\u2069";

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
    latestSummary: "Family dashboard",
    justNow: "Just now",
    chars: "chars",
    addToCalendar: "Export calendar",
    addToTodo: "Send to action list",
    export: "Share with family",
    useSummaryTitle: "Use this summary",
    useSummaryBody: "Send dates to your calendar, turn tasks into a list, or share the key update with family.",
    useSummaryCalendarHint: "Create a calendar file from the dates above.",
    useSummaryTodoHint: "Push the action items into your family to-do list.",
    useSummaryExportHint: "Download or share the parent-ready summary in one tap.",
    helpful: "Was this dashboard useful?",
    noStorage: "Stored here: this summary card. Raw chat text was not stored.",
    comingSoon: "Coming soon",
    subscribeTitle: "Subscribe to use this feature",
    subscribeBody: "Upgrade to unlock calendar export, action-list sync, and family sharing from your summaries.",
    upgradeCta: "View plans",
    later: "Maybe later",
    empty: "empty",
    nothingMentioned: "Nothing mentioned",
    bucketEmpty: "Nothing to add here yet",
    soonTitle: "Feature coming soon",
    soonBody: "This action is reserved for paid plans and is still being finished.",
    calendarEmptyTitle: "No calendar-ready dates",
    calendarEmptyBody: "This summary does not include any dates I can turn into a calendar file yet.",
    todoEmptyTitle: "No action items found",
    todoEmptyBody: "This summary does not include any to-do items yet.",
    actionErrorTitle: "Could not complete this action",
    actionErrorBody: "Please try again in a moment.",
    close: "Close",
    urgent: "Urgent",
    urgentBannerText: "Requires action today or tomorrow",
    actionCenter: "Family Action Center",
    dueToday: "Due today",
    upcomingDates: "Upcoming dates",
    paymentsForms: "Payments and forms",
    supplies: "Supplies to send",
    familyShare: "Copy family action list",
    shareHint: "Send this action list to your spouse or caregiver.",
    chatTypeUrgent: "Urgent notice",
    chatTypeEvent: "Event",
    chatTypeNoisy: "General chat",
    chatContextMessages: "messages",
    sourceWhatsApp: "WhatsApp",
    sourceTelegram: "Telegram",
    sourceFacebook: "Facebook",
    payoffTitleClear: "Nothing urgent needs your attention right now.",
    payoffTitleUrgent: "The urgent items are surfaced first.",
    payoffBody: "The key dates, actions, and follow-ups are organized below.",
    familyContext: "Personalized with saved family context",
    familyContextActiveNote: "Personalised to your saved school context",
    statusActions: "Actions",
    statusDates: "Dates",
    statusPaymentsForms: "Payments/forms",
    statusPeopleClasses: "People/classes",
    statusLinks: "Links",
    statusGeneralUpdate: "Summary ready",
    statusUrgent: "Urgent follow-ups",
    statusNothingUrgent: "Nothing urgent right now",
    milestone1: "Your first summary is saved to history. You can search and access it any time.",
    milestone5: "5 summaries saved — you've been on top of school communications for a few sessions.",
    milestone10: "Summary #10 saved. You've built a searchable school record.",
    milestone25: "25 summaries — your school history archive is growing.",
    milestone50: "50 summaries saved. That is a full term's worth of school communications organised.",
    discovery5: "Did you know? The dates extracted here can be added to your calendar, and Share with family can send the action list in one tap.",
    dismissNotice: "Dismiss notice",
  },
  ar: {
    latestSummary: "اللوحة العائلية",
    justNow: "الآن",
    chars: "حرفًا",
    addToCalendar: "صدّر التقويم",
    addToTodo: "أرسل إلى قائمة الإجراءات",
    export: "شارك مع العائلة",
    useSummaryTitle: "استخدم هذا الملخص",
    useSummaryBody: "أرسل المواعيد إلى التقويم، وحوّل المهام إلى قائمة، أو شارك التحديث المهم مع العائلة.",
    useSummaryCalendarHint: "أنشئ ملف تقويم من المواعيد الظاهرة أعلاه.",
    useSummaryTodoHint: "أضف عناصر الإجراءات إلى قائمة مهام العائلة.",
    useSummaryExportHint: "نزّل الملخص أو شاركه بصيغة جاهزة للوالدين بنقرة واحدة.",
    helpful: "هل كانت هذه اللوحة مفيدة؟",
    noStorage: "المحفوظ هنا هو بطاقة الملخص فقط. لا يتم حفظ نص المحادثة الخام.",
    comingSoon: "قريبًا",
    subscribeTitle: "اشترك لاستخدام هذه الميزة",
    subscribeBody: "قم بالترقية لفتح تصدير التقويم ومزامنة قائمة الإجراءات والمشاركة العائلية من الملخص.",
    upgradeCta: "عرض الخطط",
    later: "لاحقًا",
    empty: "فارغ",
    nothingMentioned: "لا يوجد شيء مذكور",
    bucketEmpty: "لا يوجد ما يضاف هنا بعد",
    soonTitle: "الميزة قيد الإعداد",
    soonBody: "هذه الميزة مخصصة للخطط المدفوعة وما زالت قيد الإكمال.",
    calendarEmptyTitle: "لا توجد تواريخ جاهزة للتقويم",
    calendarEmptyBody: "لا يحتوي هذا الملخص على تواريخ أستطيع تحويلها إلى ملف تقويم بعد.",
    todoEmptyTitle: "لا توجد مهام",
    todoEmptyBody: "لا يحتوي هذا الملخص على عناصر مهام بعد.",
    actionErrorTitle: "تعذر إكمال هذا الإجراء",
    actionErrorBody: "حاول مرة أخرى بعد قليل.",
    close: "إغلاق",
    urgent: "عاجل",
    urgentBannerText: "يتطلب إجراءً اليوم أو غدًا",
    actionCenter: "لوحة الإجراءات العائلية",
    dueToday: "مطلوب اليوم",
    upcomingDates: "المواعيد القادمة",
    paymentsForms: "الرسوم والنماذج",
    supplies: "مستلزمات يجب إرسالها",
    familyShare: "انسخ قائمة الإجراءات للعائلة",
    shareHint: "أرسل هذه القائمة إلى الزوج/الزوجة أو مقدم الرعاية.",
    chatTypeUrgent: "إشعار عاجل",
    chatTypeEvent: "حدث",
    chatTypeNoisy: "محادثة عامة",
    chatContextMessages: "رسالة",
    sourceWhatsApp: "واتساب",
    sourceTelegram: "تيليجرام",
    sourceFacebook: "فيسبوك",
    payoffTitleClear: "لا يوجد ما يحتاج انتباهك العاجل الآن.",
    payoffTitleUrgent: "تم إبراز العناصر العاجلة أولًا.",
    payoffBody: "تم ترتيب المواعيد والإجراءات والمتابعات المهمة أدناه.",
    familyContext: "تم تخصيصه بذاكرة العائلة المحفوظة",
    familyContextActiveNote: "مخصَّص وفق سياق مدرستك المحفوظ",
    statusActions: "الإجراءات",
    statusDates: "المواعيد",
    statusPaymentsForms: "الرسوم/النماذج",
    statusPeopleClasses: "الأشخاص/المواد",
    statusLinks: "الروابط",
    statusGeneralUpdate: "الملخص جاهز",
    statusUrgent: "متابعات عاجلة",
    statusNothingUrgent: "لا يوجد ما هو عاجل الآن",
    milestone1: "حُفظ ملخصك الأول في السجل. يمكنك البحث فيه والوصول إليه في أي وقت.",
    milestone5: "5 ملخصات محفوظة — أنت تتابع مراسلات المدرسة باستمرار.",
    milestone10: "الملخص رقم 10 محفوظ. لقد بنيت سجلاً مدرسياً قابلاً للبحث.",
    milestone25: "25 ملخصاً — أرشيف تاريخك المدرسي في نمو مستمر.",
    milestone50: "50 ملخصاً محفوظاً. هذا ما يعادل فصلاً دراسياً كاملاً من مراسلات المدرسة منظَّمة.",
    discovery5: "هل تعلم؟ يمكن إضافة المواعيد المستخرجة هنا إلى تقويمك، ويمكن لزر المشاركة مع العائلة إرسال قائمة الإجراءات بنقرة واحدة.",
    dismissNotice: "إخفاء التنبيه",
  },
} as const;

const ACTIONS = [
  { key: "calendar", icon: CalendarPlus },
  { key: "todo", icon: ListChecks },
  { key: "export", icon: Download },
] as const;

const BIDI_TEXT_STYLE = {
  unicodeBidi: "plaintext",
} as const;

function normalizeExportDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (char) => EXPORT_DIGIT_MAP[char] ?? char);
}

function wrapExportWithDirectionMarks(text: string, outputLang: OutputLang): string {
  const isRtl = outputLang === "ar";
  const isolateOpen = isRtl ? DIR_RTL_ISOLATE : DIR_LTR_ISOLATE;
  const mark = isRtl ? DIR_RLM : DIR_LRM;
  const lines = text.split("\n").map((line) => `${mark}${line}`);
  return `${isolateOpen}${lines.join("\n")}${DIR_POP_ISOLATE}`;
}

function buildSummaryExportText(
  summary: SummaryResult,
  outputLang: OutputLang,
  emptyLabel: string,
  options?: {
    includeHeadingEmojis?: boolean;
    applyDirectionMarks?: boolean;
  }
): string {
  const includeHeadingEmojis = options?.includeHeadingEmojis ?? false;
  const applyDirectionMarks = options?.applyDirectionMarks ?? false;
  const normalized = normalizeExportDigits(
    SECTION_ORDER.map((sectionKey) => {
      const baseHeading = EXPORT_HEADINGS[outputLang][sectionKey];
      const heading = includeHeadingEmojis
        ? `${EXPORT_HEADING_EMOJIS[sectionKey]} ${baseHeading}`
        : baseHeading;
      const value = sectionKey === "links" ? getMergedLinkItems(summary) : summary[sectionKey];
      const lines =
        sectionKey === "tldr"
          ? [typeof value === "string" && value.trim() ? value.trim() : emptyLabel]
          : sectionKey === "important_dates"
            ? (value as ImportantDate[]).map((d) => {
                let text = d.label;
                if (d.time) text += ` — ${d.time}`;
                if (d.location) text += ` (${d.location})`;
                if (d.urgent) text = `⚠️ ${text}`;
                return text;
              }).filter(Boolean).map((item) => `• ${item}`)
            : Array.isArray(value)
              ? (value as string[])
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .map((item) => `• ${item}`)
              : [];

      const sectionLines = lines.length > 0 ? lines : [emptyLabel];
      const separator = "-".repeat(Math.max(5, baseHeading.length + (includeHeadingEmojis ? 3 : 0)));

      return [heading, separator, ...sectionLines, ""].join("\n");
    }).join("\n").trim()
  );

  return applyDirectionMarks ? wrapExportWithDirectionMarks(normalized, outputLang) : normalized;
}

function buildPlainTextExport(summary: SummaryResult, outputLang: OutputLang, emptyLabel: string): string {
  return buildSummaryExportText(summary, outputLang, emptyLabel);
}

function buildActionCenterShareText(
  sections: Array<{ label: string; items: string[] }>,
  outputLang: OutputLang,
  emptyLabel: string,
  groupTitle?: string | null
) {
  const heading = outputLang === "ar" ? "قائمة الإجراءات العائلية" : "Family action list";
  const body = normalizeExportDigits(
    [
      groupTitle ? `${heading} - ${groupTitle}` : heading,
      "",
      ...sections.flatMap((section) => {
        const items = section.items.length > 0 ? section.items : [emptyLabel];
        return [
          section.label,
          "-".repeat(Math.max(5, section.label.length)),
          ...items.map((item) => `• ${item}`),
          "",
        ];
      }),
    ].join("\n").trim()
  );

  return formatSocialShareExport(body, outputLang);
}

function formatSocialShareExport(text: string, outputLang: OutputLang): string {
  if (outputLang !== "ar") {
    return text;
  }

  return wrapExportWithDirectionMarks(text, outputLang);
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
    .map((item, index) => {
      // Prefer the structured ISO date; fall back to text parsing for legacy strings
      let start: Date | null = null;
      if (item.date) {
        const [y, m, d] = item.date.split("-").map(Number);
        if (y && m && d) start = new Date(Date.UTC(y, m - 1, d));
      }
      if (!start) start = parseDateFromLabel(item.label, now);
      if (!start) return null;

      let dtstart: string;
      let dtend: string;
      if (item.time) {
        const [hour = 0, minute = 0] = item.time.split(":").map(Number);
        const startDt = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), hour, minute));
        const endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
        dtstart = `DTSTART:${formatIcsTimestamp(startDt)}`;
        dtend = `DTEND:${formatIcsTimestamp(endDt)}`;
      } else {
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
        dtstart = `DTSTART;VALUE=DATE:${formatIcsDate(start)}`;
        dtend = `DTEND;VALUE=DATE:${formatIcsDate(end)}`;
      }

      const descParts = [summary.tldr];
      if (item.location) descParts.push(`Location: ${item.location}`);

      return [
        "BEGIN:VEVENT",
        `UID:${formatIcsDate(start)}-${index}@fazumi.app`,
        `DTSTAMP:${formatIcsTimestamp(now)}`,
        dtstart,
        dtend,
        `SUMMARY:${escapeIcsText(item.label)}`,
        `DESCRIPTION:${escapeIcsText(descParts.join(" | "))}`,
        ...(item.location ? [`LOCATION:${escapeIcsText(item.location)}`] : []),
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

function getSourcePlatformLabel(summary: SummaryResult, outputLang: OutputLang) {
  const platform = summary.chat_context?.source_platform;
  const copy = UI_COPY[outputLang];

  if (platform === "telegram") {
    return copy.sourceTelegram;
  }

  if (platform === "facebook") {
    return copy.sourceFacebook;
  }

  if (platform === "whatsapp") {
    return copy.sourceWhatsApp;
  }

  return null;
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

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function compactUnique(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const items: string[] = [];

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    items.push(normalized);
  }

  return items;
}

function getMergedLinkItems(summary: SummaryResult) {
  return compactUnique([...summary.links, ...summary.contacts]);
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
  const value = sectionKey === "links" ? getMergedLinkItems(summary) : summary[sectionKey];

  const isEmpty =
    sectionKey === "tldr"
      ? !value || String(value).trim() === ""
      : !Array.isArray(value) || value.length === 0;

  return (
    <section
      dir={isRtl ? "rtl" : "ltr"}
      lang={isRtl ? "ar" : "en"}
      className={cn("px-5 py-5 text-start sm:px-6", isRtl && "font-arabic")}
    >
      <div
        className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)]"
      >
        {(() => {
          const Icon = meta.icon;
          return <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />;
        })()}
        <span>{label}</span>
        {isEmpty && (
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
            {copy.empty}
          </span>
        )}
      </div>

      {isEmpty ? (
        <p
          dir="auto"
          style={BIDI_TEXT_STYLE}
          className="text-start text-sm italic text-[var(--muted-foreground)]"
        >
          {copy.nothingMentioned}
        </p>
      ) : sectionKey === "tldr" ? (
        <p
          dir="auto"
          style={BIDI_TEXT_STYLE}
          className="text-start text-sm leading-7 text-[var(--card-foreground)]"
        >
          {String(value)}
        </p>
      ) : sectionKey === "important_dates" ? (
        <ul className="space-y-3">
          {(value as ImportantDate[]).map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-start text-sm text-[var(--card-foreground)]">
              <span className="mt-[0.45rem] shrink-0 text-xs leading-none text-[var(--primary)]">●</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span dir="auto" style={BIDI_TEXT_STYLE} className="font-medium leading-6">
                    {item.label}
                  </span>
                  {item.urgent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {copy.urgent}
                    </span>
                  )}
                </div>
                {(item.time ?? item.location) && (
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--muted-foreground)]">
                    {item.time && (
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        {item.time}
                      </span>
                    )}
                    {item.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.location}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : sectionKey === "action_items" && (summary.urgent_action_items?.length ?? 0) > 0 ? (
        <>
          <div className="mb-3 rounded-[var(--radius)] border border-orange-200 bg-orange-50 px-3 py-2.5 dark:border-orange-800/50 dark:bg-orange-900/20">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {copy.urgentBannerText}
            </div>
            <ul className="space-y-1">
              {summary.urgent_action_items.map((item, i) => (
                <li key={i} dir="auto" style={BIDI_TEXT_STYLE} className="text-xs text-orange-900 dark:text-orange-200">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
          <ul className="space-y-2.5">
            {(value as string[]).map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-start text-sm text-[var(--card-foreground)]">
                <span className="mt-[0.45rem] shrink-0 text-xs leading-none text-[var(--primary)]">●</span>
                <span dir="auto" style={BIDI_TEXT_STYLE} className="min-w-0 flex-1 leading-7">{item}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ul className="space-y-2.5">
          {(value as string[]).map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-start text-sm text-[var(--card-foreground)]"
            >
              <span className="mt-[0.45rem] shrink-0 text-xs leading-none text-[var(--primary)]">●</span>
              <span
                dir="auto"
                style={BIDI_TEXT_STYLE}
                className="min-w-0 flex-1 leading-7"
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type SummaryDisplayCopy = (typeof UI_COPY)[OutputLang];

function getInlineNoticeMessage(noticeId: string, copy: SummaryDisplayCopy) {
  switch (noticeId) {
    case "milestone-1":
      return copy.milestone1;
    case "milestone-5":
      return copy.milestone5;
    case "milestone-10":
      return copy.milestone10;
    case "milestone-25":
      return copy.milestone25;
    case "milestone-50":
      return copy.milestone50;
    case "discovery-5":
      return copy.discovery5;
    default:
      return null;
  }
}

interface SummaryDisplayProps {
  summary: SummaryResult;
  outputLang: OutputLang;
  familyContextActive?: boolean;
  inlineNoticeIds?: readonly string[];
  onDismissNotice?: (noticeId: string) => void;
  actionMode?: ActionMode;
  upgradeHref?: string;
}

export function SummaryDisplay({
  summary,
  outputLang,
  familyContextActive = false,
  inlineNoticeIds = [],
  onDismissNotice,
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
  const upgradeCtaLabel = paymentsComingSoon
    ? withPaymentComingSoonLabel(copy.upgradeCta, outputLang)
    : copy.upgradeCta;
  const formattedCharCount = formatNumber(summary.char_count);
  const savedMinutes = formatNumber(Math.max(2, Math.round(summary.char_count / 400)));
  const savedTimeLabel = outputLang === "ar" ? `وفَّرت ~${savedMinutes} دقيقة` : `Saved ~${savedMinutes} min`;
  const actionCenter = deriveActionCenter(summary);
  const sourcePlatformLabel = getSourcePlatformLabel(summary, outputLang);
  const discoveryTrackedKeyRef = useRef<string | null>(null);
  const familyContextItems = compactUnique([
    summary.chat_context?.child_name,
    summary.chat_context?.class_name,
    summary.chat_context?.school_name,
  ]);
  const actionCenterSections = [
    { key: "due_today", label: copy.dueToday, items: actionCenter.due_today },
    { key: "upcoming_dates", label: copy.upcomingDates, items: actionCenter.upcoming_dates },
    { key: "payments_forms", label: copy.paymentsForms, items: actionCenter.payments_forms },
    { key: "supplies", label: copy.supplies, items: actionCenter.supplies },
    { key: "questions", label: SECTION_META.questions[outputLang], items: actionCenter.questions },
    { key: "urgent_items", label: copy.urgent, items: actionCenter.urgent_items },
  ];
  const discoveryNoticeKey = inlineNoticeIds.includes("discovery-5")
    ? `${summary.char_count}:${outputLang}`
    : null;

  useEffect(() => {
    if (!discoveryNoticeKey || discoveryTrackedKeyRef.current === discoveryNoticeKey) {
      return;
    }

    discoveryTrackedKeyRef.current = discoveryNoticeKey;
    trackEvent(AnalyticsEvents.FEATURE_DISCOVERY_SHOWN, {
      feature: "calendar_export_and_family_share",
      milestone: 5,
      output_lang: outputLang,
    });
  }, [discoveryNoticeKey, outputLang]);

  async function runAction(actionKey: ActionKey, action: () => Promise<void> | void) {
    setPendingAction(actionKey);

    try {
      await waitForNextPaint();
      await action();
    } finally {
      setPendingAction(null);
    }
  }

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

    trackEvent(AnalyticsEvents.ACTION_CENTER_USED, {
      action: actionKey,
      outputLang,
      sourcePlatform: summary.chat_context?.source_platform ?? null,
    });

    if (actionKey === "export") {
      await runAction("export", async () => {
        setShowSharePanel(true);
      });
      return;
    }

    if (actionKey === "calendar") {
      await runAction("calendar", async () => {
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
      });
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

    await runAction("todo", async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setInfoDialog(null);
          setDialogVariant("upgrade");
          return;
        }

        const health = await getClientHealthSnapshot();
        if (getTodoStorageMode(health) === "local") {
          mergeLocalTodoLabels(user.id, actionItems);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event(TODOS_CHANGED_EVENT));
          }
          router.push("/todo");
          return;
        }

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
      }
    });
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      lang={isRtl ? "ar" : "en"}
      className={cn("animate-summary-fade-in space-y-3 text-start", isRtl && "font-arabic")}
    >
      <Card className="overflow-hidden bg-[var(--surface-elevated)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-muted)]/60 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              {copy.latestSummary}
            </h2>
            <span className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--primary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
              {copy.justNow}
            </span>
            <span className="text-xs text-[var(--muted-foreground)]">
              {savedTimeLabel}
            </span>
            {summary.chat_type === "urgent_notice" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <AlertTriangle className="h-2.5 w-2.5" />
                {copy.chatTypeUrgent}
              </span>
            )}
            {summary.chat_type === "event_announcement" && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {copy.chatTypeEvent}
              </span>
            )}
            {summary.chat_type === "noisy_general_chat" && (
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                {copy.chatTypeNoisy}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            {summary.chat_context?.message_count_estimate != null && (
              <span>~{summary.chat_context.message_count_estimate} {copy.chatContextMessages}</span>
            )}
            {summary.chat_context?.date_range && (
              <span className="hidden sm:inline">{summary.chat_context.date_range}</span>
            )}
            <span>{formattedCharCount} {copy.chars}</span>
          </div>
        </div>

        <div className="border-b border-[var(--border)] bg-[var(--surface)]/50 px-4 py-4 sm:px-5">
          <StatusLine
            summary={summary}
            outputLang={outputLang}
            className="mb-4"
          />
          {familyContextActive ? (
            <p
              data-testid="summary-family-context-note"
              className="mb-4 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]"
            >
              <Sparkles className="h-3 w-3 shrink-0" />
              <span>{copy.familyContextActiveNote}</span>
            </p>
          ) : null}
          {inlineNoticeIds.length > 0 ? (
            <div className="mb-4 space-y-3">
              {inlineNoticeIds.map((noticeId) => {
                const message = getInlineNoticeMessage(noticeId, copy);

                if (!message) {
                  return null;
                }

                return (
                  <div
                    key={noticeId}
                    data-testid={`summary-inline-notice-${noticeId}`}
                    className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]/85 px-4 py-3"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="min-w-0 flex-1 text-sm leading-6 text-[var(--muted-foreground)]">
                      {message}
                    </p>
                    {onDismissNotice ? (
                      <button
                        type="button"
                        onClick={() => onDismissNotice(noticeId)}
                        className="shrink-0 text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                        aria-label={copy.dismissNotice}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          <div
            data-testid="summary-payoff"
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4"
          >
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {actionCenter.urgent_items.length > 0 ? copy.payoffTitleUrgent : copy.payoffTitleClear}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
              {copy.payoffBody}
            </p>

            {familyContextItems.length > 0 && (
              <div
                data-testid="summary-family-context"
                className="mt-3 flex flex-wrap items-center gap-2"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                  {copy.familyContext}
                </span>
                {familyContextItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}

          </div>
        </div>

        <div className="border-t border-[var(--border)] bg-[var(--surface)]/55 px-4 py-4 sm:px-5">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
              {copy.useSummaryTitle}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
              {copy.useSummaryBody}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {ACTIONS.map(({ key, icon: Icon }) => {
              const label =
                key === "calendar"
                  ? copy.addToCalendar
                  : key === "todo"
                    ? copy.addToTodo
                    : copy.export;
              const hint =
                key === "calendar"
                  ? copy.useSummaryCalendarHint
                  : key === "todo"
                    ? copy.useSummaryTodoHint
                    : copy.useSummaryExportHint;
              const isPending = pendingAction === key;

              return (
                <button
                  key={key}
                  type="button"
                  data-testid={`summary-action-${key}`}
                  onClick={() => {
                    void handleActionClick(key);
                  }}
                  className={cn(
                    "flex min-h-[84px] w-full flex-col items-start justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-start hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60",
                    isPending && "opacity-50"
                  )}
                  disabled={actionMode === "disabled" || pendingAction !== null}
                  title={actionMode === "disabled" ? copy.comingSoon : undefined}
                  aria-busy={isPending}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                    {isPending ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Icon className="h-4 w-4 text-[var(--primary)]" />
                    )}
                    {label}
                  </span>
                  <span className="text-xs leading-5 text-[var(--muted-foreground)]">
                    {hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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

        {showSharePanel && (() => {
          const exportText = buildPlainTextExport(summary, outputLang, copy.nothingMentioned);
          const familyActionList = buildActionCenterShareText(
            actionCenterSections,
            outputLang,
            copy.bucketEmpty,
            summary.chat_context?.group_title
          );
          const socialShareText = familyActionList;
          const short = familyActionList.slice(0, 1500);
          const waUrl = `https://wa.me/?text=${encodeURIComponent(short)}`;
          const tgUrl = `https://t.me/share/url?text=${encodeURIComponent(short)}`;
          const isTruncated = familyActionList.length > 1500;
          const truncatedCount = formatNumber(1500);
          const truncatedNote =
            outputLang === "ar"
              ? `يتم إرسال أول ${truncatedCount} حرف`
              : `Only the first ${truncatedCount} chars are sent`;

          function handleCopyFb() {
            navigator.clipboard.writeText(socialShareText).catch(() => {});
            setCopiedTarget("fb");
            setTimeout(() => setCopiedTarget((curr) => (curr === "fb" ? null : curr)), 2000);
          }

          return (
            <div
              data-testid="summary-share-panel"
              dir={isRtl ? "rtl" : "ltr"}
              lang={isRtl ? "ar" : "en"}
              className="border-b border-[var(--border)] bg-[var(--surface)]/60 px-4 py-3 text-start sm:px-5"
            >
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
                    : copy.familyShare}
                </button>

                <button
                  type="button"
                  onClick={() => setShowSharePanel(false)}
                  className="ms-auto rounded-lg border border-transparent px-2 py-1 text-xs font-medium text-[var(--muted-foreground)] hover:border-[var(--border)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                  aria-label={outputLang === "ar" ? "إغلاق" : "Close share panel"}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {isTruncated && (
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {truncatedNote}
                </p>
              )}
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {copy.shareHint}
              </p>
            </div>
          );
        })()}

        <section className="border-t border-[var(--border)] bg-[var(--surface)]/50 px-4 py-4 sm:px-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
              {copy.actionCenter}
            </span>
            {summary.chat_context?.group_title && (
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]">
                {summary.chat_context.group_title}
              </span>
            )}
            {sourcePlatformLabel && (
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)]">
                {sourcePlatformLabel}
              </span>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {actionCenterSections.map((section) => (
              <div
                key={section.key}
                className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                  {section.label}
                </p>
                {section.items.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {section.items.map((item) => (
                      <li key={`${section.key}:${item}`} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
                        <span className="mt-1 text-xs text-[var(--primary)]">●</span>
                        <span dir="auto" style={BIDI_TEXT_STYLE} className="min-w-0 flex-1 leading-6">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {copy.bucketEmpty}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-[var(--border)] bg-[var(--surface)]/60 px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-[var(--foreground)]">
              {copy.helpful}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHelpful("up")}
                className={cn(
                  "rounded-full p-1.5 transition-colors",
                  helpful === "up"
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]"
                )}
                aria-label={outputLang === "ar" ? "إفادة إيجابية" : "Thumbs up"}
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setHelpful("down")}
                className={cn(
                  "rounded-full p-1.5 transition-colors",
                  helpful === "down"
                    ? "bg-[var(--destructive)] text-white"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--destructive-soft)] hover:text-[var(--destructive)]"
                )}
                aria-label={outputLang === "ar" ? "إفادة سلبية" : "Thumbs down"}
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
        titleId="summary-dialog-title"
      >
        {infoDialog ? (
          <div
            dir={isRtl ? "rtl" : "ltr"}
            lang={isRtl ? "ar" : "en"}
            className={cn("space-y-4 text-start", isRtl && "font-arabic")}
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
            className={cn("space-y-4 text-start", isRtl && "font-arabic")}
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
                  {upgradeCtaLabel}
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


