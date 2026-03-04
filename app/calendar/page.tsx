import { DashboardShell } from "@/components/layout/DashboardShell";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CalendarPage() {
  return (
    <DashboardShell>
      <Card className="mb-4">
        <CardHeader>
          <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-3xl)]">
            <LocalizedText en="Calendar" ar="التقويم" />
          </h1>
          <CardDescription>
            <LocalizedText
              en="Important dates extracted from your summaries will appear here automatically."
              ar="ستظهر هنا تلقائيًا التواريخ المهمة المستخرجة من ملخصاتك."
            />
          </CardDescription>
        </CardHeader>
      </Card>
      <CalendarWidget />
    </DashboardShell>
  );
}
