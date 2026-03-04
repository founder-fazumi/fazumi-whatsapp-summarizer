"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { getClientHealthSnapshot, getTodoStorageMode } from "@/lib/feature-health";
import { formatDate, formatNumber } from "@/lib/format";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { readLocalTodos } from "@/lib/todos/local";

const SUMMARY_SAVED_EVENT = "fazumi-summary-saved";
const TODOS_CHANGED_EVENT = "fazumi-todos-changed";

type TodoPreview = {
  id: string;
  label: string;
  due_date: string | null;
  sort_order: number;
  created_at: string;
};

let _cachedItems: TodoPreview[] = [];
let _cachedCount = 0;

const COPY = {
  title: { en: "To-Do", ar: "المهام" },
  emptyTitle: { en: "Nothing here yet.", ar: "لا يوجد شيء هنا بعد." },
  emptyBody: {
    en: "Nothing here yet.",
    ar: "لا يوجد شيء هنا بعد.",
  },
  viewAll: { en: "View all →", ar: "عرض الكل ←" },
  deviceBadge: { en: "This device", ar: "هذا الجهاز" },
  deviceBody: {
    en: "Tasks are stored locally in this environment until database sync is enabled.",
    ar: "يتم حفظ المهام محليًا في هذه البيئة حتى يتم تفعيل مزامنة قاعدة البيانات.",
  },
} satisfies Record<string, LocalizedCopy<string>>;

type TodoSupabase = ReturnType<typeof createClient>;

export function TodoWidget() {
  const { locale } = useLang();
  const [todoItems, setTodoItems] = useState<TodoPreview[]>(_cachedItems);
  const [pendingCount, setPendingCount] = useState(_cachedCount);
  const [storageMode, setStorageMode] = useState<"remote" | "local">("remote");

  useEffect(() => {
    let active = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    async function loadTodos() {
      let supabase: TodoSupabase;

      try {
        supabase = createClient();
      } catch {
        if (active) {
          setTodoItems([]);
          setPendingCount(0);
        }
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (!user) {
        setTodoItems([]);
        setPendingCount(0);
        return;
      }

      const health = await getClientHealthSnapshot();
      const nextStorageMode = getTodoStorageMode(health);
      setStorageMode(nextStorageMode);

      if (nextStorageMode === "local") {
        const localItems = readLocalTodos(user.id).filter((item) => !item.done);
        const items = localItems.slice(0, 5).map((item) => ({
          id: item.id,
          label: item.label,
          due_date: item.due_date,
          sort_order: item.sort_order,
          created_at: item.created_at,
        }));
        _cachedItems = items;
        _cachedCount = localItems.length;
        setTodoItems(items);
        setPendingCount(localItems.length);
        return;
      }

      const { data, count, error } = await supabase
        .from("user_todos")
        .select("id, label, due_date, sort_order, created_at", { count: "exact" })
        .eq("user_id", user.id)
        .eq("done", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(5);

      if (!active) {
        return;
      }

      if (error) {
        setTodoItems([]);
        setPendingCount(0);
        return;
      }

      const items = (data ?? []) as TodoPreview[];
      const total = count ?? 0;
      _cachedItems = items;
      _cachedCount = total;
      setTodoItems(items);
      setPendingCount(total);
    }

    void loadTodos();

    try {
      const supabase = createClient();
      const { data } = supabase.auth.onAuthStateChange(() => {
        void loadTodos();
      });
      authSubscription = data.subscription;
    } catch {
      // Ignore missing client env configuration and keep the empty state.
    }

    const handleRefresh = () => {
      void loadTodos();
    };

    window.addEventListener(SUMMARY_SAVED_EVENT, handleRefresh);
    window.addEventListener(TODOS_CHANGED_EVENT, handleRefresh);

    return () => {
      active = false;
      authSubscription?.unsubscribe();
      window.removeEventListener(SUMMARY_SAVED_EVENT, handleRefresh);
      window.removeEventListener(TODOS_CHANGED_EVENT, handleRefresh);
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          {pick(COPY.title, locale)}{" "}
          <span className="font-normal text-[var(--muted-foreground)]">
            ({formatNumber(pendingCount)})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        {storageMode === "local" ? (
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3">
            <p className="text-caption font-semibold text-[var(--foreground)]">
              {pick(COPY.deviceBadge, locale)}
            </p>
            <p className="mt-1 text-caption text-[var(--muted-foreground)]">
              {pick(COPY.deviceBody, locale)}
            </p>
          </div>
        ) : null}

        {todoItems.length === 0 ? (
          <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] px-3 py-3">
            <p className="text-xs font-semibold text-[var(--foreground)]">
              {pick(COPY.emptyTitle, locale)}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
              {pick(COPY.emptyBody, locale)}
            </p>
          </div>
        ) : (
          todoItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 rounded-[var(--radius)] px-2.5 py-2 transition-colors hover:bg-[var(--surface-muted)]"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-snug text-[var(--foreground)]">
                  {item.label}
                </p>
                {item.due_date ? (
                  <div className="mt-1">
                    <span className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]">
                      {formatDate(new Date(`${item.due_date}T00:00:00`), locale, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}

        {todoItems.length > 0 ? (
          <div className="pt-1">
            <Link
              href="/todo"
              className="text-xs font-medium text-[var(--primary)] underline-offset-4 hover:underline"
            >
              {pick(COPY.viewAll, locale)}
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
