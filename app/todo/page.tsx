import { DashboardShell } from "@/components/layout/DashboardShell";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { TodoList } from "@/components/widgets/TodoList";
import { Card, CardHeader, CardDescription } from "@/components/ui/card";

export default function TodoPage() {
  return (
    <DashboardShell>
      <Card className="mb-4">
        <CardHeader>
          <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-3xl)]">
            <LocalizedText en="To-Do" ar="المهام" />
          </h1>
          <CardDescription>
            <LocalizedText
              en="Action items extracted from your summaries will appear here automatically."
              ar="ستظهر هنا تلقائيًا بنود المهام المستخرجة من ملخصاتك."
            />
          </CardDescription>
        </CardHeader>
      </Card>
      <TodoList />
    </DashboardShell>
  );
}
