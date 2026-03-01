import { DashboardShell } from "@/components/layout/DashboardShell";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { TodoWidget } from "@/components/widgets/TodoWidget";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function TodoPage() {
  return (
    <DashboardShell>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>
            <LocalizedText en="To-Do" ar="المهام" />
          </CardTitle>
          <CardDescription>
            <LocalizedText
              en="Action items extracted from your summaries will appear here automatically."
              ar="ستظهر هنا تلقائيًا بنود المهام المستخرجة من ملخصاتك."
            />
          </CardDescription>
        </CardHeader>
      </Card>
      <TodoWidget />
    </DashboardShell>
  );
}
