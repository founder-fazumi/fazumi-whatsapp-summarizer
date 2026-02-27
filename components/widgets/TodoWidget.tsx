import { CheckCircle2, Circle, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Priority = "high" | "medium" | "low";

interface TodoItem {
  label: string;
  done: boolean;
  subject: string;
  priority: Priority;
  date: string;
}

const TODO_ITEMS: TodoItem[] = [
  { label: "Review math chapters 4–6", done: true,  subject: "Math",    priority: "high",   date: "Mar 3" },
  { label: "Sign permission slip",      done: false, subject: "Admin",   priority: "high",   date: "Mar 4" },
  { label: "Buy art supplies",          done: false, subject: "Art",     priority: "medium", date: "Mar 6" },
  { label: "Check school portal",       done: false, subject: "General", priority: "low",    date: "Mar 7" },
  { label: "Prepare for science quiz",  done: false, subject: "Science", priority: "medium", date: "Mar 8" },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  high:   "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  low:    "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

const SUBJECT_COLORS: Record<string, string> = {
  Math:    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  Admin:   "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  Art:     "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400",
  General: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  Science: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
};

export function TodoWidget() {
  const total = TODO_ITEMS.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            To-Do{" "}
            <span className="text-[var(--muted-foreground)] font-normal">({total})</span>
          </CardTitle>
          <button className="flex items-center gap-1 rounded-full bg-[var(--primary)] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 transition-opacity">
            <Plus className="h-3 w-3" />
            Add new
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 pb-3">
        {TODO_ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-2 rounded-[var(--radius)] px-2 py-1.5 hover:bg-[var(--muted)] transition-colors"
          >
            {item.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-xs leading-snug",
                  item.done
                    ? "line-through text-[var(--muted-foreground)]"
                    : "text-[var(--foreground)]"
                )}
              >
                {item.label}
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    SUBJECT_COLORS[item.subject] ?? "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  )}
                >
                  {item.subject}
                </span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize",
                    PRIORITY_COLORS[item.priority]
                  )}
                >
                  {item.priority}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">{item.date}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
