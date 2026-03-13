"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, CheckSquare, Copy, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { useLang } from "@/lib/context/LangContext";
import { useDashboardInsights } from "@/lib/hooks/useDashboardInsights";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const COPY = {
  en: {
    title: "Family coordination",
    description: "Ship the simple coordination layer first: spouse or caregiver sharing, shared calendar export, and one clean action list.",
    copy: "Copy spouse/caregiver update",
    copied: "Copied",
    calendar: "Open shared calendar",
    todo: "Open action list",
    empty: "Summarize one school chat to generate a family-ready update.",
    upcoming: "Upcoming dates",
    actions: "Family action list",
  },
  ar: {
    title: "تنسيق العائلة",
    description: "ابدأ بطبقة التنسيق البسيطة أولًا: مشاركة مع الزوج أو الزوجة أو مقدم الرعاية، وتصدير تقويم مشترك، وقائمة إجراءات واحدة واضحة.",
    copy: "انسخ تحديث الزوج/الزوجة أو مقدم الرعاية",
    copied: "تم النسخ",
    calendar: "افتح التقويم المشترك",
    todo: "افتح قائمة الإجراءات",
    empty: "لخّص محادثة مدرسية واحدة لإنشاء تحديث جاهز للعائلة.",
    upcoming: "المواعيد القادمة",
    actions: "قائمة الإجراءات العائلية",
  },
} as const;

export function FamilyCoordinationCard() {
  const { locale } = useLang();
  const copy = COPY[locale];
  const isRtl = locale === "ar";
  const { calendarItems, todoItems } = useDashboardInsights();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const lines = [
      copy.actions,
      ...todoItems.slice(0, 5).map((item) => `• ${item.label}`),
      "",
      copy.upcoming,
      ...calendarItems.slice(0, 4).map((item) => {
        if (!item.isoDate) {
          return `• ${item.label}`;
        }

        return `• ${formatDate(item.isoDate, locale, {
          month: "short",
          day: "numeric",
        })} — ${item.label}`;
      }),
    ].filter(Boolean);

    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    trackEvent(AnalyticsEvents.ACTION_CENTER_USED, {
      action: "dashboard_family_share",
      source: "dashboard",
    });
    window.setTimeout(() => setCopied(false), 2000);
  }

  const hasContent = todoItems.length > 0 || calendarItems.length > 0;

  return (
    <Card dir={isRtl ? "rtl" : "ltr"} lang={locale} className={cn("bg-[var(--surface-elevated)]", isRtl && "font-arabic")}>
      <CardHeader className={cn(isRtl && "text-right")}>
        <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary)]">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-4", isRtl && "text-right")}>
        {hasContent ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                  {copy.actions}
                </p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--foreground)]">
                  {todoItems.slice(0, 4).map((item) => (
                    <li key={item.id} className={cn("flex items-start gap-2", isRtl && "flex-row-reverse text-right")}>
                      <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                  {copy.upcoming}
                </p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--foreground)]">
                  {calendarItems.slice(0, 4).map((item) => (
                    <li key={item.id} className={cn("flex items-start gap-2", isRtl && "flex-row-reverse text-right")}>
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                      <span>
                        {item.isoDate
                          ? `${formatDate(item.isoDate, locale, {
                              month: "short",
                              day: "numeric",
                            })} — ${item.label}`
                          : item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={cn("flex flex-wrap gap-3", isRtl && "justify-end")}>
              <Button type="button" onClick={() => void handleCopy()}>
                <Copy className="h-4 w-4" />
                {copied ? copy.copied : copy.copy}
              </Button>
              <Link href="/calendar" className={buttonVariants({ variant: "outline" })}>
                {copy.calendar}
              </Link>
              <Link href="/todo" className={buttonVariants({ variant: "outline" })}>
                {copy.todo}
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            {copy.empty}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
