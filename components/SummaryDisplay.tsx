"use client";

import { useState } from "react";
import Link from "next/link";
import { ThumbsUp, ThumbsDown, CalendarPlus, ListChecks, Download, Zap } from "lucide-react";
import type { SummaryResult } from "@/lib/ai/summarize";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type OutputLang = "en" | "ar";
type ActionMode = "disabled" | "gated" | "coming-soon";

const SECTION_META: Record<
  string,
  { en: string; ar: string; icon: string }
> = {
  tldr:             { en: "TL;DR",                    ar: "الخلاصة",               icon: "📋" },
  important_dates:  { en: "Important Dates",           ar: "المواعيد المهمة",       icon: "📅" },
  action_items:     { en: "Action Items / To-Do",      ar: "الإجراءات المطلوبة",    icon: "✅" },
  people_classes:   { en: "People / Classes",          ar: "الأشخاص / المواد",      icon: "👥" },
  links:            { en: "Links & Attachments",       ar: "الروابط والمرفقات",     icon: "🔗" },
  questions:        { en: "Questions to Ask",          ar: "أسئلة للمعلم / المدرسة", icon: "❓" },
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
    close: "إغلاق",
  },
} as const;

const ACTIONS = [
  { key: "calendar", icon: CalendarPlus },
  { key: "todo", icon: ListChecks },
  { key: "export", icon: Download },
] as const;

function SectionCard({
  sectionKey,
  summary,
  outputLang,
}: {
  sectionKey: SectionKey;
  summary: SummaryResult;
  outputLang: OutputLang;
}) {
  const [open, setOpen] = useState(true);
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
    <Card>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-t-[var(--radius-xl)] px-5 py-3.5 hover:bg-[var(--muted)] transition-colors",
          isRtl ? "text-right" : "text-left"
        )}
        aria-expanded={open}
      >
        <span className="text-base shrink-0">{meta.icon}</span>
        <span className="flex-1 text-sm font-semibold text-[var(--card-foreground)]">
          {label}
        </span>
        {isEmpty && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
            {copy.empty}
          </span>
        )}
        <span
          className={cn(
            "text-[var(--muted-foreground)] text-xs transition-transform duration-200",
            open ? "rotate-180" : ""
          )}
        >
          ▾
        </span>
      </button>

      {open && (
        <CardContent
          dir={isRtl ? "rtl" : "ltr"}
          lang={isRtl ? "ar" : "en"}
          className={cn(
            "pt-1 pb-4",
            isRtl && "font-arabic text-right"
          )}
        >
          {isEmpty ? (
            <p className="text-sm text-[var(--muted-foreground)] italic">
              {copy.nothingMentioned}
            </p>
          ) : sectionKey === "tldr" ? (
            <p className="text-sm leading-relaxed text-[var(--card-foreground)]">
              {String(value)}
            </p>
          ) : (
            <ul className={cn("space-y-2", isRtl ? "pr-2" : "pl-2")}>
              {(value as string[]).map((item, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex gap-2 text-sm text-[var(--card-foreground)]",
                    isRtl && "flex-row-reverse text-right"
                  )}
                >
                  <span className="mt-1 shrink-0 text-[var(--primary)] leading-none">•</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
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
  const [helpful, setHelpful] = useState<"up" | "down" | null>(null);
  const [dialogVariant, setDialogVariant] = useState<"upgrade" | "soon" | null>(null);
  const copy = UI_COPY[outputLang];
  const isRtl = outputLang === "ar";
  const formattedCharCount = formatNumber(summary.char_count);

  function handleActionClick() {
    if (actionMode === "gated") {
      setDialogVariant("upgrade");
      return;
    }

    if (actionMode === "coming-soon") {
      setDialogVariant("soon");
    }
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      lang={isRtl ? "ar" : "en"}
      className={cn("space-y-3", isRtl && "font-arabic text-right")}
    >
      {/* ── Latest Summary header ─────────────────── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[var(--primary)]" />
          <h2 className="font-semibold text-sm text-[var(--foreground)]">
            {copy.latestSummary}
          </h2>
          <span className="flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--primary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
            {copy.justNow}
          </span>
        </div>
        <span className="text-xs text-[var(--muted-foreground)]">
          {formattedCharCount} {copy.chars}
        </span>
      </div>

      {/* ── Quick action pills ────────────────────── */}
      <div className="flex gap-2 flex-wrap px-1">
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
              onClick={handleActionClick}
              className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              disabled={actionMode === "disabled"}
              title={actionMode === "disabled" ? copy.comingSoon : undefined}
            >
              <Icon className="h-3.5 w-3.5 text-[var(--primary)]" />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Section cards ─────────────────────────── */}
      {SECTION_ORDER.map((key) => (
        <SectionCard
          key={key}
          sectionKey={key}
          summary={summary}
          outputLang={outputLang}
        />
      ))}

      {/* ── Was this helpful? ─────────────────────── */}
      <div className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
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
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
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
                ? "bg-red-500 text-white"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            )}
            aria-label="Thumbs down"
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-[var(--muted-foreground)] pt-1">
        ✅ {copy.noStorage}
      </p>

      <Dialog
        open={dialogVariant !== null}
        onOpenChange={(open) => {
          if (!open) setDialogVariant(null);
        }}
        title={dialogVariant === "upgrade" ? copy.subscribeTitle : copy.soonTitle}
      >
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
      </Dialog>
    </div>
  );
}
