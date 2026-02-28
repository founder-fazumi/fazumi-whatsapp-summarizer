import { DashboardShell } from "@/components/layout/DashboardShell";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CalendarPage() {
  return (
    <DashboardShell>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>
            <LocalizedText en="Calendar" ar="التقويم" />
          </CardTitle>
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
