"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  MessageCircle,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { formatDate, formatNumber } from "@/lib/format";
import { pick, type Locale, type LocalizedCopy } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const TODOS_CHANGED_EVENT = "fazumi-todos-changed";

const COPY = {
  title: { en: "To-Do", ar: "المهام" },
  addPlaceholder: { en: "Add a task…", ar: "أضف مهمة…" },
  completedSection: { en: "Completed", ar: "المكتملة" },
  emptyTitle: { en: "No tasks yet.", ar: "لا مهام بعد." },
  emptyBody: {
    en: "Summarize a chat to generate action items, or add one below.",
    ar: "لخّص محادثة أو أضف مهمة يدويًا.",
  },
  noteHint: { en: "Add a note…", ar: "أضف ملاحظة…" },
  overdue: { en: "Overdue", ar: "متأخرة" },
  today: { en: "Today", ar: "اليوم" },
  tomorrow: { en: "Tomorrow", ar: "غداً" },
  signInMsg: { en: "Sign in to manage your to-do list.", ar: "سجّل الدخول لإدارة مهامك." },
  moveUp: { en: "Move up", ar: "تحريك لأعلى" },
  moveDown: { en: "Move down", ar: "تحريك لأسفل" },
  deleteTask: { en: "Delete task", ar: "حذف المهمة" },
  editNote: { en: "Edit note", ar: "تعديل الملاحظة" },
  setDueDate: { en: "Set due date", ar: "تحديد تاريخ الاستحقاق" },
  toggleTask: { en: "Toggle task", ar: "تبديل حالة المهمة" },
  undoTask: { en: "Undo task", ar: "التراجع عن المهمة" },
} satisfies Record<string, LocalizedCopy<string>>;

type TodoSupabase = ReturnType<typeof createClient>;

type TodoItem = {
  id: string;
  user_id: string;
  label: string;
  done: boolean;
  due_date: string | null;
  sort_order: number;
  note: string | null;
  source: string;
  created_at: string;
  updated_at: string;
};

type DueTone = "overdue" | "today" | "future";

const NOTE_PREVIEW_STYLE: CSSProperties = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  overflow: "hidden",
};

function sortItems(items: TodoItem[]) {
  return [...items].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
  });
}

function parseDateValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getDueDisplay(dueDate: string, locale: Locale) {
  const parsed = parseDateValue(dueDate);

  if (!parsed) {
    return {
      label: dueDate,
      tone: "future" as DueTone,
    };
  }

  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (parsed.getTime() < today.getTime()) {
    return {
      label: `${pick(COPY.overdue, locale)} · ${formatDate(parsed, locale, { month: "short", day: "numeric" })}`,
      tone: "overdue" as DueTone,
    };
  }

  if (isSameDay(parsed, today)) {
    return {
      label: pick(COPY.today, locale),
      tone: "today" as DueTone,
    };
  }

  if (isSameDay(parsed, tomorrow)) {
    return {
      label: pick(COPY.tomorrow, locale),
      tone: "future" as DueTone,
    };
  }

  return {
    label: formatDate(parsed, locale, {
      month: "short",
      day: "numeric",
      ...(parsed.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
    }),
    tone: "future" as DueTone,
  };
}

function getDueChipStyle(tone: DueTone): CSSProperties {
  if (tone === "overdue") {
    return { backgroundColor: "color-mix(in srgb, var(--destructive) 12%, transparent)" };
  }

  if (tone === "today") {
    return { backgroundColor: "color-mix(in srgb, var(--primary) 16%, transparent)" };
  }

  return { backgroundColor: "var(--surface-muted)" };
}

function getNextSortOrder(items: TodoItem[]) {
  return items.reduce((highest, item) => Math.max(highest, item.sort_order), -1) + 1;
}

export function TodoList() {
  const { locale } = useLang();
  const supabaseRef = useRef<TodoSupabase | null>(null);
  const addInputRef = useRef<HTMLInputElement | null>(null);
  const addingRef = useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addValue, setAddValue] = useState("");
  const [completedOpen, setCompletedOpen] = useState(false);
  const [openDateItemId, setOpenDateItemId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  function ensureSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }

    return supabaseRef.current;
  }

  function emitTodosChanged() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(TODOS_CHANGED_EVENT));
    }
  }

  useEffect(() => {
    let active = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    async function loadTodos() {
      let supabase: TodoSupabase;

      try {
        supabase = supabaseRef.current ?? createClient();
        supabaseRef.current = supabase;
      } catch {
        if (active) {
          setUser(null);
          setItems([]);
          setIsLoading(false);
        }
        return;
      }

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      setUser(currentUser);

      if (!currentUser) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_todos")
        .select("id, user_id, label, done, due_date, sort_order, note, source, created_at, updated_at")
        .eq("user_id", currentUser.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!active) {
        return;
      }

      if (error) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      setItems(sortItems((data ?? []) as TodoItem[]));
      setIsLoading(false);
    }

    void loadTodos();

    try {
      const supabase = supabaseRef.current ?? createClient();
      supabaseRef.current = supabase;
      const { data } = supabase.auth.onAuthStateChange(() => {
        setIsLoading(true);
        void loadTodos();
      });
      authSubscription = data.subscription;
    } catch {
      // Ignore missing client env configuration and render the signed-out state.
    }

    return () => {
      active = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  const pendingItems = items.filter((item) => !item.done);
  const completedItems = items.filter((item) => item.done);

  function openNoteEditor(item: TodoItem) {
    setEditingNoteId(item.id);
    setNoteDrafts((current) => ({
      ...current,
      [item.id]: current[item.id] ?? item.note ?? "",
    }));
  }

  async function toggleDone(item: TodoItem) {
    let supabase: TodoSupabase;

    try {
      supabase = ensureSupabase();
    } catch {
      return;
    }

    const previousItems = items;
    const updatedAt = new Date().toISOString();

    setItems(
      sortItems(
        items.map((current) =>
          current.id === item.id ? { ...current, done: !current.done, updated_at: updatedAt } : current
        )
      )
    );

    const { error } = await supabase
      .from("user_todos")
      .update({ done: !item.done, updated_at: updatedAt })
      .eq("id", item.id);

    if (error) {
      setItems(previousItems);
      return;
    }

    emitTodosChanged();
  }

  async function addItem() {
    const label = addValue.trim();

    if (!label || !user || addingRef.current) {
      return;
    }

    let supabase: TodoSupabase;

    try {
      supabase = ensureSupabase();
    } catch {
      return;
    }

    addingRef.current = true;
    setAddValue("");

    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("user_todos")
      .insert({
        user_id: user.id,
        label,
        sort_order: getNextSortOrder(items),
        updated_at: updatedAt,
      })
      .select("id, user_id, label, done, due_date, sort_order, note, source, created_at, updated_at")
      .single();

    addingRef.current = false;

    if (error || !data) {
      setAddValue(label);
      return;
    }

    setItems((current) => sortItems([...current, data as TodoItem]));
    emitTodosChanged();
  }

  async function deleteItem(itemId: string) {
    let supabase: TodoSupabase;

    try {
      supabase = ensureSupabase();
    } catch {
      return;
    }

    const previousItems = items;
    setItems(items.filter((item) => item.id !== itemId));
    setOpenDateItemId((current) => (current === itemId ? null : current));
    setEditingNoteId((current) => (current === itemId ? null : current));

    const { error } = await supabase.from("user_todos").delete().eq("id", itemId);

    if (error) {
      setItems(previousItems);
      return;
    }

    emitTodosChanged();
  }

  async function updateDueDate(item: TodoItem, dueDate: string | null) {
    let supabase: TodoSupabase;

    try {
      supabase = ensureSupabase();
    } catch {
      return;
    }

    const normalized = dueDate?.trim() ? dueDate : null;

    if (normalized === item.due_date) {
      setOpenDateItemId(null);
      return;
    }

    const previousItems = items;
    const updatedAt = new Date().toISOString();

    setItems(
      sortItems(
        items.map((current) =>
          current.id === item.id ? { ...current, due_date: normalized, updated_at: updatedAt } : current
        )
      )
    );
    setOpenDateItemId(null);

    const { error } = await supabase
      .from("user_todos")
      .update({ due_date: normalized, updated_at: updatedAt })
      .eq("id", item.id);

    if (error) {
      setItems(previousItems);
      return;
    }

    emitTodosChanged();
  }

  async function saveNote(item: TodoItem) {
    let supabase: TodoSupabase;

    try {
      supabase = ensureSupabase();
    } catch {
      return;
    }

    const nextNote = (noteDrafts[item.id] ?? item.note ?? "").trim() || null;

    if (nextNote === (item.note ?? null)) {
      setEditingNoteId((current) => (current === item.id ? null : current));
      return;
    }

    const previousItems = items;
    const updatedAt = new Date().toISOString();

    setItems(
      sortItems(
        items.map((current) =>
          current.id === item.id ? { ...current, note: nextNote, updated_at: updatedAt } : current
        )
      )
    );
    setEditingNoteId((current) => (current === item.id ? null : current));

    const { error } = await supabase
      .from("user_todos")
      .update({ note: nextNote, updated_at: updatedAt })
      .eq("id", item.id);

    if (error) {
      setItems(previousItems);
      return;
    }

    emitTodosChanged();
  }

  async function moveItem(item: TodoItem, direction: "up" | "down") {
    let supabase: TodoSupabase;

    try {
      supabase = ensureSupabase();
    } catch {
      return;
    }

    const orderedPending = sortItems(pendingItems);
    const index = orderedPending.findIndex((current) => current.id === item.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= orderedPending.length) {
      return;
    }

    const targetItem = orderedPending[targetIndex];
    const previousItems = items;
    const updatedAt = new Date().toISOString();

    setItems(
      sortItems(
        items.map((current) => {
          if (current.id === item.id) {
            return { ...current, sort_order: targetItem.sort_order, updated_at: updatedAt };
          }

          if (current.id === targetItem.id) {
            return { ...current, sort_order: item.sort_order, updated_at: updatedAt };
          }

          return current;
        })
      )
    );

    const [{ error: firstError }, { error: secondError }] = await Promise.all([
      supabase.from("user_todos").update({ sort_order: targetItem.sort_order, updated_at: updatedAt }).eq("id", item.id),
      supabase.from("user_todos").update({ sort_order: item.sort_order, updated_at: updatedAt }).eq("id", targetItem.id),
    ]);

    if (firstError || secondError) {
      setItems(previousItems);
      return;
    }

    emitTodosChanged();
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="min-h-24" />
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className={cn("p-4", locale === "ar" && "text-right")}>
          <Link
            href="/login"
            className="text-sm font-medium leading-relaxed text-[var(--primary)] underline-offset-4 hover:underline"
          >
            {pick(COPY.signInMsg, locale)}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className={cn("p-2 sm:p-3", locale === "ar" && "text-right")}>
        <div className="space-y-1">
          {pendingItems.length === 0 ? (
            <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] px-3 py-3">
              <p className="text-sm font-medium leading-relaxed text-[var(--foreground)]">
                {pick(COPY.emptyTitle, locale)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
                {pick(COPY.emptyBody, locale)}
              </p>
            </div>
          ) : (
            pendingItems.map((item, index) => {
              const dueDisplay = item.due_date ? getDueDisplay(item.due_date, locale) : null;
              const isEditingNote = editingNoteId === item.id;
              const noteValue = noteDrafts[item.id] ?? item.note ?? "";

              return (
                <div
                  key={item.id}
                  className="group relative flex min-h-[52px] items-start gap-3 rounded-[var(--radius)] px-3 py-3 transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <button
                    type="button"
                    onClick={() => void toggleDone(item)}
                    aria-label={pick(COPY.toggleTask, locale)}
                    className="mt-0.5 shrink-0 rounded-full"
                  >
                    <Circle className="h-5 w-5 text-[var(--border)] transition-colors group-hover:text-[var(--primary)]" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-relaxed text-[var(--foreground)]">{item.label}</p>

                    {item.note && !isEditingNote ? (
                      <button
                        type="button"
                        onClick={() => openNoteEditor(item)}
                        className={cn(
                          "mt-2 block w-full rounded-md text-left text-xs leading-relaxed text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]",
                          locale === "ar" && "text-right"
                        )}
                        style={NOTE_PREVIEW_STYLE}
                      >
                        {item.note}
                      </button>
                    ) : null}

                    {isEditingNote ? (
                      <textarea
                        autoFocus
                        value={noteValue}
                        onChange={(event) =>
                          setNoteDrafts((current) => ({
                            ...current,
                            [item.id]: event.currentTarget.value,
                          }))
                        }
                        onBlur={() => void saveNote(item)}
                        placeholder={pick(COPY.noteHint, locale)}
                        className="mt-2 min-h-20 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs leading-relaxed text-[var(--foreground)] outline-none ring-0 placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]"
                      />
                    ) : null}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenDateItemId((current) => (current === item.id ? null : item.id))}
                          aria-label={pick(COPY.setDueDate, locale)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs leading-relaxed transition-opacity",
                            dueDisplay
                              ? dueDisplay.tone === "overdue"
                                ? "text-[var(--destructive)]"
                                : dueDisplay.tone === "today"
                                  ? "text-[var(--primary)]"
                                  : "text-[var(--muted-foreground)]"
                              : "border border-dashed border-[var(--border)] text-[var(--muted-foreground)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          )}
                          style={dueDisplay ? getDueChipStyle(dueDisplay.tone) : undefined}
                        >
                          {dueDisplay ? (
                            <>
                              <Calendar className="h-3 w-3" />
                              <span>{dueDisplay.label}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              <Calendar className="h-3 w-3" />
                            </>
                          )}
                        </button>

                        {openDateItemId === item.id ? (
                          <input
                            autoFocus
                            type="date"
                            value={item.due_date ?? ""}
                            onChange={(event) => void updateDueDate(item, event.currentTarget.value || null)}
                            onBlur={() => setOpenDateItemId((current) => (current === item.id ? null : current))}
                            className="absolute top-full z-10 mt-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)] shadow-[var(--shadow-sm)] outline-none"
                          />
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => openNoteEditor(item)}
                        aria-label={pick(COPY.editNote, locale)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs leading-relaxed text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
                          !item.note && "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        )}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => void moveItem(item, "up")}
                      disabled={index === 0}
                      aria-label={pick(COPY.moveUp, locale)}
                      className="rounded-full p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void moveItem(item, "down")}
                      disabled={index === pendingItems.length - 1}
                      aria-label={pick(COPY.moveDown, locale)}
                      className="rounded-full p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteItem(item.id)}
                      aria-label={pick(COPY.deleteTask, locale)}
                      className="rounded-full p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--destructive)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          <label htmlFor="todo-add-task" className="flex min-h-[52px] items-center gap-3 px-3 py-3">
            <Plus className="h-5 w-5 shrink-0 text-[var(--primary)]" />
            <input
              id="todo-add-task"
              ref={addInputRef}
              type="text"
              value={addValue}
              onChange={(event) => setAddValue(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addItem();
                }
              }}
              onBlur={() => {
                if (addValue.trim()) {
                  void addItem();
                }
              }}
              placeholder={pick(COPY.addPlaceholder, locale)}
              className="flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-sm placeholder:text-[var(--muted-foreground)]"
            />
          </label>

          {completedItems.length > 0 ? (
            <div>
              <button
                type="button"
                onClick={() => setCompletedOpen((current) => !current)}
                aria-expanded={completedOpen}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]"
              >
                {completedOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <span>
                  {pick(COPY.completedSection, locale)} ({formatNumber(completedItems.length)})
                </span>
              </button>

              {completedOpen
                ? completedItems.map((item) => {
                    const dueDisplay = item.due_date ? getDueDisplay(item.due_date, locale) : null;

                    return (
                      <div
                        key={item.id}
                        className="flex min-h-[52px] items-start gap-3 rounded-[var(--radius)] px-3 py-3 text-[var(--muted-foreground)]"
                      >
                        <button
                          type="button"
                          onClick={() => void toggleDone(item)}
                          aria-label={pick(COPY.toggleTask, locale)}
                          className="mt-0.5 shrink-0 rounded-full"
                        >
                          <CheckCircle2 className="h-5 w-5 text-[var(--primary)]" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-relaxed line-through">{item.label}</p>
                          {dueDisplay ? (
                            <div className="mt-2">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs leading-relaxed",
                                  dueDisplay.tone === "overdue"
                                    ? "text-[var(--destructive)]"
                                    : dueDisplay.tone === "today"
                                      ? "text-[var(--primary)]"
                                      : "text-[var(--muted-foreground)]"
                                )}
                                style={getDueChipStyle(dueDisplay.tone)}
                              >
                                <Calendar className="h-3 w-3" />
                                <span>{dueDisplay.label}</span>
                              </span>
                            </div>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => void toggleDone(item)}
                          aria-label={pick(COPY.undoTask, locale)}
                          className="rounded-full p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })
                : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
