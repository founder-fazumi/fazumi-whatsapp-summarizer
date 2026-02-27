import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const UPCOMING = [
  { date: "Mon Mar 3", label: "Math Test – Chapter 6", color: "destructive" as const },
  { date: "Wed Mar 5", label: "Science project due", color: "default" as const },
  { date: "Fri Mar 7", label: "Parent-Teacher Meeting", color: "secondary" as const },
];

export function CalendarWidget() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-[var(--primary)]" />
          Upcoming
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {UPCOMING.map((item) => (
          <div key={item.label} className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
              {item.date}
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[var(--card-foreground)] leading-snug">
                {item.label}
              </span>
              <Badge variant={item.color} className="shrink-0 text-[10px]">
                {item.color === "destructive" ? "Due" : item.color === "default" ? "Task" : "Event"}
              </Badge>
            </div>
          </div>
        ))}
        <p className="text-[10px] text-[var(--muted-foreground)] pt-1 text-center">
          Dates extracted from your summaries will appear here
        </p>
      </CardContent>
    </Card>
  );
}
