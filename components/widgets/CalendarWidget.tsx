"use client";

import Link from "next/link";
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
  selectedDate: { en: "Selected day", ar: "اليوم المحدد" },
  selectedDateEmptyTitle: { en: "No items on this date.", ar: "لا توجد عناصر في هذا التاريخ." },
  selectedDateEmptyBody: {
    en: "Choose another marked date to review the linked school updates.",
    ar: "اختر تاريخًا آخر يحمل علامة لمراجعة التحديثات المدرسية المرتبطة به.",
  },
  openSummary: { en: "Open summary", ar: "افتح الملخص" },
  emptyTitle: { en: "Nothing here yet.", ar: "لا يوجد شيء هنا بعد." },
  emptyBody: {
    en: "Nothing here yet.",
    ar: "لا يوجد شيء هنا بعد.",
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
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const isArabic = locale === "ar";

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
    setSelectedDateKey(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
      return;
    }

    setViewMonth((month) => month - 1);
  }

  function next() {
    setSelectedDateKey(null);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
      return;
    }

    setViewMonth((month) => month + 1);
  }

  const selectedDateItems = selectedDateKey
    ? calendarItems.filter((item) => item.dateKey === selectedDateKey)
    : calendarItems;
  const selectedDateLabel = selectedDateKey
    ? formatDate(new Date(`${selectedDateKey}T12:00:00Z`), locale, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Card dir={isArabic ? "rtl" : "ltr"} lang={locale} className={cn(isArabic && "font-arabic")}>
      <CardHeader className="px-4 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prev}
            aria-label={locale === "ar" ? "الشهر السابق" : "Previous month"}
            className="rounded-full p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]"
          >
            <ChevronLeft className={cn("h-4 w-4", locale === "ar" && "rotate-180")} />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--foreground)]">
              {MONTH_NAMES[locale][viewMonth]} {formatNumber(viewYear)}
            </span>
            <button
              type="button"
              onClick={() => {
                setViewMonth(today.getMonth());
                setViewYear(today.getFullYear());
                setSelectedDateKey(null);
              }}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-xs font-medium text-[var(--muted-foreground)] shadow-[var(--shadow-xs)] hover:bg-[var(--surface-muted)]"
            >
              {pick(COPY.today, locale)}
            </button>
          </div>

          <button
            type="button"
            onClick={next}
            aria-label={locale === "ar" ? "الشهر التالي" : "Next month"}
            className="rounded-full p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]"
          >
            <ChevronRight className={cn("h-4 w-4", locale === "ar" && "rotate-180")} />
          </button>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-4">
        <div className="mb-1 grid grid-cols-7">
          {WEEKDAYS[locale].map((day) => (
            <div key={day} className="py-1 text-center text-xs font-semibold text-[var(--muted-foreground)]">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} />;

            const currentDateKey = dateKey(day);
            const eventCount = eventsByDate[currentDateKey] ?? 0;
            const isSelected = selectedDateKey === currentDateKey;
            return (
              <div key={`${viewYear}-${viewMonth}-${day}`} className="flex flex-col items-center py-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDateKey((current) => (current === currentDateKey ? null : currentDateKey));
                  }}
                  aria-pressed={isSelected}
                  aria-label={
                    eventCount > 0
                      ? locale === "ar"
                        ? `اعرض تفاصيل ${formatNumber(day)}`
                        : `Show details for ${formatNumber(day)}`
                      : locale === "ar"
                        ? `${formatNumber(day)}`
                        : String(day)
                  }
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium leading-none transition-colors",
                    isToday(day)
                      ? "bg-[var(--primary)] font-bold text-white"
                      : isSelected
                        ? "bg-[var(--surface-muted)] text-[var(--foreground)]"
                        : "text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
                    eventCount > 0 && !isToday(day) && "ring-1 ring-[var(--primary)]/30"
                  )}
                >
                  {formatNumber(day)}
                </button>
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
          <div className={cn("mb-2 flex items-baseline justify-between gap-3", isArabic && "text-right")}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              {selectedDateLabel ? pick(COPY.selectedDate, locale) : pick(COPY.upcoming, locale)}
            </p>
            {selectedDateLabel ? (
              <span className="text-xs font-medium text-[var(--text-strong)]">{selectedDateLabel}</span>
            ) : null}
          </div>

          {calendarItems.length === 0 ? (
            <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] px-3 py-3">
              <p className="text-xs font-semibold text-[var(--foreground)]">{pick(COPY.emptyTitle, locale)}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
                {pick(COPY.emptyBody, locale)}
              </p>
            </div>
          ) : selectedDateKey && selectedDateItems.length === 0 ? (
            <div className={cn("rounded-[var(--radius)] bg-[var(--surface-muted)] px-3 py-3", isArabic && "text-right")}>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {pick(COPY.selectedDateEmptyTitle, locale)}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
                {pick(COPY.selectedDateEmptyBody, locale)}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {selectedDateItems.map((item) => (
                <li key={item.id} className={cn("flex items-start gap-2", isArabic && "flex-row-reverse text-right")}>
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-[var(--foreground)]">{item.label}</p>
                    {item.isoDate && (
                      <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                        {formatDate(item.isoDate, locale, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                    <Link
                      href={`/history/${item.summaryId}`}
                      className="mt-1 inline-flex text-sm font-medium text-[var(--primary)] hover:underline"
                    >
                      {pick(COPY.openSummary, locale)}
                    </Link>
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
