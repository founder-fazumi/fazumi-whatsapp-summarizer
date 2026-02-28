"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber } from "@/lib/format";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const WEEKDAYS: Record<"en" | "ar", string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  ar: ["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"],
};

const MONTH_NAMES: Record<"en" | "ar", string[]> = {
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  ar: [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ],
};

const EVENTS: Record<string, { color: string; label: LocalizedCopy<string> }[]> = {
  "2026-02-09": [{ color: "bg-blue-400", label: { en: "Math test", ar: "اختبار الرياضيات" } }],
  "2026-02-14": [{ color: "bg-pink-400", label: { en: "Valentine's Day", ar: "يوم فالنتاين" } }],
  "2026-02-17": [{ color: "bg-[var(--primary)]", label: { en: "Homework due", ar: "موعد الواجب" } }],
  "2026-02-23": [{ color: "bg-amber-400", label: { en: "Field trip", ar: "الرحلة المدرسية" } }],
  "2026-02-27": [{ color: "bg-purple-400", label: { en: "Parent meeting", ar: "اجتماع أولياء الأمور" } }],
};

const UPCOMING = [
  {
    date: { en: "Feb 27", ar: "27 فبراير" },
    dot: "bg-purple-400",
    label: { en: "Parent meeting", ar: "اجتماع أولياء الأمور" },
  },
  {
    date: { en: "Mar 2", ar: "2 مارس" },
    dot: "bg-blue-400",
    label: { en: "Science project due", ar: "موعد مشروع العلوم" },
  },
  {
    date: { en: "Mar 5", ar: "5 مارس" },
    dot: "bg-[var(--primary)]",
    label: { en: "School Sports Day", ar: "اليوم الرياضي المدرسي" },
  },
];

const COPY = {
  today: { en: "Today", ar: "اليوم" },
  upcoming: { en: "Upcoming. Next 7 days", ar: "القادم خلال 7 أيام" },
} satisfies Record<string, LocalizedCopy<string>>;

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function CalendarWidget() {
  const { locale } = useLang();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const dateKey = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  function prev() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function next() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <button
            onClick={prev}
            className="rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--foreground)]">
              {MONTH_NAMES[locale][viewMonth]} {formatNumber(viewYear)}
            </span>
            <button
              onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }}
              className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              {pick(COPY.today, locale)}
            </button>
          </div>

          <button
            onClick={next}
            className="rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS[locale].map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-[var(--muted-foreground)] py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;
            const key = dateKey(day);
            const events = EVENTS[key] ?? [];
            return (
              <div key={key} className="flex flex-col items-center py-0.5">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium leading-none",
                    isToday(day)
                      ? "bg-[var(--primary)] text-white font-bold"
                      : "text-[var(--foreground)] hover:bg-[var(--muted)] cursor-default"
                  )}
                >
                  {formatNumber(day)}
                </span>
                {events.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {events.slice(0, 3).map((ev, i) => (
                      <span key={i} className={cn("h-1 w-1 rounded-full", ev.color)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Upcoming */}
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
            {pick(COPY.upcoming, locale)}
          </p>
          <ul className="space-y-1.5">
            {UPCOMING.map(({ date, dot, label }) => (
              <li key={label.en} className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
                <span className="text-[11px] text-[var(--muted-foreground)] w-[42px] shrink-0">{pick(date, locale)}</span>
                <span className="text-[11px] text-[var(--foreground)] truncate">{pick(label, locale)}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
