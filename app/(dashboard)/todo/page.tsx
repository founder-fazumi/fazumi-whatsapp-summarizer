"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { TodoList } from "@/components/widgets/TodoList";
import { Card, CardHeader, CardDescription } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { cn } from "@/lib/utils";

export default function TodoPage() {
  const { locale } = useLang();
  const isArabic = locale === "ar";

  return (
    <DashboardShell>
      <div dir={isArabic ? "rtl" : "ltr"} lang={locale} className={cn("space-y-4", isArabic && "font-arabic")}>
        <Card className="mb-4">
          <CardHeader className={cn(isArabic && "text-right")}>
          <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-3xl)]">
            <LocalizedText en="Family action list" ar="قائمة الإجراءات العائلية" />
          </h1>
          <CardDescription className="leading-relaxed">
            <LocalizedText
              en="Action items extracted from your summaries appear here automatically so your family has one clean list to work from."
              ar="تظهر هنا تلقائيًا عناصر الإجراءات المستخرجة من ملخصاتك حتى تمتلك العائلة قائمة واحدة واضحة للعمل منها."
            />
          </CardDescription>
          </CardHeader>
        </Card>
        <TodoList />
      </div>
    </DashboardShell>
  );
}
