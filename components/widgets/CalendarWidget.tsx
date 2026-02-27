"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const EVENTS: Record<string, { color: string; label: string }[]> = {
  "2026-02-09": [{ color: "bg-blue-400",          label: "Math test" }],
  "2026-02-14": [{ color: "bg-pink-400",           label: "Valentine's Day" }],
  "2026-02-17": [{ color: "bg-[var(--primary)]",  label: "Homework due" }],
  "2026-02-23": [{ color: "bg-amber-400",          label: "Field trip" }],
  "2026-02-27": [{ color: "bg-purple-400",         label: "Parent meeting" }],
};

const UPCOMING = [
  { date: "Feb 27", dot: "bg-purple-400",          label: "Parent meeting" },
  { date: "Mar 2",  dot: "bg-blue-400",            label: "Science project due" },
  { date: "Mar 5",  dot: "bg-[var(--primary)]",   label: "School Sports Day" },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function CalendarWidget() {
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
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }}
              className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              Today
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
          {WEEKDAYS.map((d) => (
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
                  {day}
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
            Upcoming · Next 7 days
          </p>
          <ul className="space-y-1.5">
            {UPCOMING.map(({ date, dot, label }) => (
              <li key={label} className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
                <span className="text-[11px] text-[var(--muted-foreground)] w-[42px] shrink-0">{date}</span>
                <span className="text-[11px] text-[var(--foreground)] truncate">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
