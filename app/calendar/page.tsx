import { DashboardShell } from "@/components/layout/DashboardShell";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CalendarPage() {
  return (
    <DashboardShell>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>
            Important dates extracted from your summaries will appear here automatically.
          </CardDescription>
        </CardHeader>
      </Card>
      <CalendarWidget />
    </DashboardShell>
  );
}
