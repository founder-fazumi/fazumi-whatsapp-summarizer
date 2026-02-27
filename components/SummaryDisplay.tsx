"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, CalendarPlus, ListChecks, Download, Zap } from "lucide-react";
import type { SummaryResult } from "@/lib/ai/summarize";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type OutputLang = "en" | "ar";

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
  const value = summary[sectionKey];

  const isEmpty =
    sectionKey === "tldr"
      ? !value || String(value).trim() === ""
      : !Array.isArray(value) || value.length === 0;

  return (
    <Card>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-5 py-3.5 text-left rounded-t-[var(--radius-xl)] hover:bg-[var(--muted)] transition-colors"
        aria-expanded={open}
      >
        <span className="text-base shrink-0">{meta.icon}</span>
        <span className="flex-1 text-sm font-semibold text-[var(--card-foreground)]">
          {label}
        </span>
        {isEmpty && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
            {outputLang === "ar" ? "فارغ" : "empty"}
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
              {outputLang === "ar" ? "لا شيء مذكور" : "Nothing mentioned"}
            </p>
          ) : sectionKey === "tldr" ? (
            <p className="text-sm leading-relaxed text-[var(--card-foreground)]">
              {String(value)}
            </p>
          ) : (
            <ul className={cn("space-y-2", isRtl ? "pr-2" : "pl-2")}>
              {(value as string[]).map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--card-foreground)]">
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
}

export function SummaryDisplay({ summary, outputLang }: SummaryDisplayProps) {
  const [helpful, setHelpful] = useState<"up" | "down" | null>(null);

  return (
    <div className="space-y-3">
      {/* ── Latest Summary header ─────────────────── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[var(--primary)]" />
          <h2 className="font-semibold text-sm text-[var(--foreground)]">
            Latest Summary
          </h2>
          <span className="flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--primary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
            Just now
          </span>
        </div>
        <span className="text-xs text-[var(--muted-foreground)]">
          {summary.char_count.toLocaleString()} chars
        </span>
      </div>

      {/* ── Quick action pills ────────────────────── */}
      <div className="flex gap-2 flex-wrap px-1">
        <button
          className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          disabled
          title="Coming soon"
        >
          <CalendarPlus className="h-3.5 w-3.5 text-[var(--primary)]" />
          Add to Calendar
        </button>
        <button
          className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          disabled
          title="Coming soon"
        >
          <ListChecks className="h-3.5 w-3.5 text-[var(--primary)]" />
          Add to To-Do
        </button>
        <button
          className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          disabled
          title="Coming soon"
        >
          <Download className="h-3.5 w-3.5 text-[var(--primary)]" />
          Export
        </button>
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
          Was this summary helpful?
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
        ✅ No chat text was stored — only this summary.
      </p>
    </div>
  );
}
