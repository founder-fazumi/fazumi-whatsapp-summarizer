import { DashboardShell } from "@/components/layout/DashboardShell";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { Card, CardHeader, CardDescription } from "@/components/ui/card";

export default function CalendarPage() {
  return (
    <DashboardShell>
      <Card className="mb-4">
        <CardHeader>
          <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-3xl)]">
            <LocalizedText en="Shared calendar" ar="التقويم المشترك" />
          </h1>
          <CardDescription>
            <LocalizedText
              en="Important dates extracted from your summaries appear here automatically so the whole family can plan from one place."
              ar="تظهر هنا تلقائيًا التواريخ المهمة المستخرجة من ملخصاتك حتى تخطط العائلة كلها من مكان واحد."
            />
          </CardDescription>
        </CardHeader>
      </Card>
      <CalendarWidget />
    </DashboardShell>
  );
}
