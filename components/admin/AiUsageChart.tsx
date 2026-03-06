import type { AdminChartPoint } from "@/lib/admin/types";
import { AdminLineChart } from "@/components/admin/AdminLineChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AiUsageChart({
  title,
  description,
  points,
  color,
}: {
  title: string;
  description: string;
  points: AdminChartPoint[];
  color: string;
}) {
  return (
    <Card className="bg-[var(--surface-elevated)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
      </CardHeader>
      <CardContent>
        <AdminLineChart points={points} color={color} />
      </CardContent>
    </Card>
  );
}
