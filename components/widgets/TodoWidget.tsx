"use client";

import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { formatDate, formatNumber } from "@/lib/format";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { useDashboardInsights } from "@/lib/hooks/useDashboardInsights";

const COPY = {
  title: { en: "To-Do", ar: "المهام" },
  emptyTitle: { en: "No action items yet", ar: "لا توجد مهام بعد" },
  emptyBody: {
    en: "When summaries include action items, they will show up here automatically.",
    ar: "عندما تتضمن الملخصات مهامًا مطلوبة، ستظهر هنا تلقائيًا.",
  },
  fromSummary: { en: "From recent summary", ar: "من ملخص حديث" },
} satisfies Record<string, LocalizedCopy<string>>;

export function TodoWidget() {
  const { locale } = useLang();
  const { todoItems } = useDashboardInsights();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          {pick(COPY.title, locale)}{" "}
          <span className="font-normal text-[var(--muted-foreground)]">({formatNumber(todoItems.length)})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        {todoItems.length === 0 ? (
          <div className="rounded-[var(--radius)] bg-[var(--muted)] px-3 py-3">
            <p className="text-xs font-semibold text-[var(--foreground)]">{pick(COPY.emptyTitle, locale)}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
              {pick(COPY.emptyBody, locale)}
            </p>
          </div>
        ) : (
          todoItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 rounded-[var(--radius)] px-2 py-1.5 transition-colors hover:bg-[var(--muted)]"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-snug text-[var(--foreground)]">{item.label}</p>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
                  <span>{pick(COPY.fromSummary, locale)}</span>
                  <span>·</span>
                  <span>
                    {formatDate(item.createdAt, locale, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
