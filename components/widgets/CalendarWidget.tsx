"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { formatDate, formatNumber } from "@/lib/format";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { useDashboardInsights } from "@/lib/hooks/useDashboardInsights";
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

const COPY = {
  today: { en: "Today", ar: "اليوم" },
  upcoming: { en: "Important Dates", ar: "المواعيد المهمة" },
  emptyTitle: { en: "No dates yet", ar: "لا توجد مواعيد بعد" },
  emptyBody: {
    en: "Summaries with extracted dates will appear here automatically.",
    ar: "ستظهر هنا تلقائيًا الملخصات التي تحتوي على تواريخ مستخرجة.",
  },
} satisfies Record<string, LocalizedCopy<string>>;

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function CalendarWidget() {
  const { locale } = useLang();
  const { calendarItems } = useDashboardInsights();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDate = calendarItems.reduce<Record<string, number>>((accumulator, item) => {
    if (!item.dateKey) {
      return accumulator;
    }

    accumulator[item.dateKey] = (accumulator[item.dateKey] ?? 0) + 1;
    return accumulator;
  }, {});

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const dateKey = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  function prev() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
      return;
    }

    setViewMonth((month) => month - 1);
  }

  function next() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
      return;
    }

    setViewMonth((month) => month + 1);
  }

  return (
    <Card>
      <CardHeader className="px-4 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <button
            onClick={prev}
            className="rounded-md p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--foreground)]">
              {MONTH_NAMES[locale][viewMonth]} {formatNumber(viewYear)}
            </span>
            <button
              onClick={() => {
                setViewMonth(today.getMonth());
                setViewYear(today.getFullYear());
              }}
              className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]"
            >
              {pick(COPY.today, locale)}
            </button>
          </div>

          <button
            onClick={next}
            className="rounded-md p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-4">
        <div className="mb-1 grid grid-cols-7">
          {WEEKDAYS[locale].map((day) => (
            <div key={day} className="py-1 text-center text-[10px] font-semibold text-[var(--muted-foreground)]">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} />;

            const eventCount = eventsByDate[dateKey(day)] ?? 0;
            return (
              <div key={`${viewYear}-${viewMonth}-${day}`} className="flex flex-col items-center py-0.5">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium leading-none",
                    isToday(day)
                      ? "bg-[var(--primary)] font-bold text-white"
                      : "cursor-default text-[var(--foreground)] hover:bg-[var(--muted)]"
                  )}
                >
                  {formatNumber(day)}
                </span>
                {eventCount > 0 && (
                  <div className="mt-0.5 flex gap-0.5">
                    {Array.from({ length: Math.min(eventCount, 3) }, (_, dotIndex) => (
                      <span key={dotIndex} className="h-1 w-1 rounded-full bg-[var(--primary)]" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            {pick(COPY.upcoming, locale)}
          </p>

          {calendarItems.length === 0 ? (
            <div className="rounded-[var(--radius)] bg-[var(--muted)] px-3 py-3">
              <p className="text-xs font-semibold text-[var(--foreground)]">{pick(COPY.emptyTitle, locale)}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                {pick(COPY.emptyBody, locale)}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {calendarItems.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] leading-snug text-[var(--foreground)]">{item.label}</p>
                    {item.isoDate && (
                      <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                        {formatDate(item.isoDate, locale, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
