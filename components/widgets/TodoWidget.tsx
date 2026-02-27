import { CheckSquare, Square } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TODO_ITEMS = [
  { label: "Review math chapters 4–6", done: true },
  { label: "Sign permission slip for field trip", done: false },
  { label: "Buy art supplies for Thursday", done: false },
  { label: "Check school portal for grades", done: false },
];

export function TodoWidget() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CheckSquare className="h-4 w-4 text-[var(--primary)]" />
          To-Do
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {TODO_ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-2.5 text-xs text-[var(--card-foreground)]"
          >
            {item.done ? (
              <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
            ) : (
              <Square className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
            )}
            <span
              className={item.done ? "line-through text-[var(--muted-foreground)]" : ""}
            >
              {item.label}
            </span>
          </div>
        ))}
        <p className="text-[10px] text-[var(--muted-foreground)] pt-1 text-center">
          Action items from summaries will appear here
        </p>
      </CardContent>
    </Card>
  );
}
