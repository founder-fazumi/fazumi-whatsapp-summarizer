"use client";

import { CheckCircle2, Circle, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber } from "@/lib/format";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Priority = "high" | "medium" | "low";

interface TodoItem {
  label: LocalizedCopy<string>;
  done: boolean;
  subject: LocalizedCopy<string>;
  priority: Priority;
  date: string;
}

const TODO_ITEMS: TodoItem[] = [
  {
    label: { en: "Review math chapters 4-6", ar: "راجع فصول الرياضيات 4-6" },
    done: true,
    subject: { en: "Math", ar: "رياضيات" },
    priority: "high",
    date: "Mar 3",
  },
  {
    label: { en: "Sign permission slip", ar: "وقّع استمارة الموافقة" },
    done: false,
    subject: { en: "Admin", ar: "إداري" },
    priority: "high",
    date: "Mar 4",
  },
  {
    label: { en: "Buy art supplies", ar: "اشترِ أدوات الرسم" },
    done: false,
    subject: { en: "Art", ar: "فن" },
    priority: "medium",
    date: "Mar 6",
  },
  {
    label: { en: "Check school portal", ar: "تحقّق من بوابة المدرسة" },
    done: false,
    subject: { en: "General", ar: "عام" },
    priority: "low",
    date: "Mar 7",
  },
  {
    label: { en: "Prepare for science quiz", ar: "استعد لاختبار العلوم" },
    done: false,
    subject: { en: "Science", ar: "علوم" },
    priority: "medium",
    date: "Mar 8",
  },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  low: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

const SUBJECT_COLORS: Record<string, string> = {
  Math: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  Admin: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  Art: "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400",
  General: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  Science: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
};

const COPY = {
  title: { en: "To-Do", ar: "المهام" },
  add: { en: "Add new", ar: "إضافة" },
  high: { en: "high", ar: "عالي" },
  medium: { en: "medium", ar: "متوسط" },
  low: { en: "low", ar: "منخفض" },
} satisfies Record<string, LocalizedCopy<string>>;

export function TodoWidget() {
  const { locale } = useLang();
  const total = TODO_ITEMS.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {pick(COPY.title, locale)}{" "}
            <span className="font-normal text-[var(--muted-foreground)]">({formatNumber(total)})</span>
          </CardTitle>
          <button className="flex items-center gap-1 rounded-full bg-[var(--primary)] px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90">
            <Plus className="h-3 w-3" />
            {pick(COPY.add, locale)}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 pb-3">
        {TODO_ITEMS.map((item) => {
          const subject = pick(item.subject, locale);
          const subjectKey = item.subject.en;

          return (
            <div
              key={item.label.en}
              className="flex items-start gap-2 rounded-[var(--radius)] px-2 py-1.5 transition-colors hover:bg-[var(--muted)]"
            >
              {item.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-xs leading-snug",
                    item.done ? "line-through text-[var(--muted-foreground)]" : "text-[var(--foreground)]"
                  )}
                >
                  {pick(item.label, locale)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      SUBJECT_COLORS[subjectKey] ?? "bg-[var(--muted)] text-[var(--muted-foreground)]"
                    )}
                  >
                    {subject}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      PRIORITY_COLORS[item.priority]
                    )}
                  >
                    {pick(COPY[item.priority], locale)}
                  </span>
                  <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">{item.date}</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
