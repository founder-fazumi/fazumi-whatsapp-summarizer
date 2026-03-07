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
            <LocalizedText en="Family action list" ar="قائمة الإجراءات العائلية" />
          </h1>
          <CardDescription>
            <LocalizedText
              en="Action items extracted from your summaries appear here automatically so your family has one clean list to work from."
              ar="تظهر هنا تلقائيًا عناصر الإجراءات المستخرجة من ملخصاتك حتى تمتلك العائلة قائمة واحدة واضحة للعمل منها."
            />
          </CardDescription>
        </CardHeader>
      </Card>
      <TodoList />
    </DashboardShell>
  );
}
