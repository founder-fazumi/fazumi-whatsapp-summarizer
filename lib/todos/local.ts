export interface ClientTodoItem {
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
}

const LOCAL_TODO_STORAGE_PREFIX = "fazumi_local_todos_v1";

function getLocalTodoStorageKey(userId: string) {
  return `${LOCAL_TODO_STORAGE_PREFIX}:${userId}`;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function buildLocalTodoId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function coerceTodoItem(value: unknown): ClientTodoItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<ClientTodoItem>;
  if (
    typeof item.id !== "string" ||
    typeof item.user_id !== "string" ||
    typeof item.label !== "string" ||
    typeof item.done !== "boolean" ||
    typeof item.sort_order !== "number" ||
    typeof item.source !== "string" ||
    typeof item.created_at !== "string" ||
    typeof item.updated_at !== "string"
  ) {
    return null;
  }

  return {
    id: item.id,
    user_id: item.user_id,
    label: item.label,
    done: item.done,
    due_date: typeof item.due_date === "string" ? item.due_date : null,
    sort_order: item.sort_order,
    note: typeof item.note === "string" ? item.note : null,
    source: item.source,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

export function normalizeTodoLabel(value: string) {
  return value.trim().toLowerCase();
}

export function sortTodoItems(items: ClientTodoItem[]) {
  return [...items].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
  });
}

export function readLocalTodos(userId: string) {
  if (!canUseLocalStorage()) {
    return [] as ClientTodoItem[];
  }

  try {
    const raw = window.localStorage.getItem(getLocalTodoStorageKey(userId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortTodoItems(
      parsed
        .map(coerceTodoItem)
        .filter((item): item is ClientTodoItem => Boolean(item))
    );
  } catch {
    return [];
  }
}

export function writeLocalTodos(userId: string, items: ClientTodoItem[]) {
  if (!canUseLocalStorage()) {
    return [] as ClientTodoItem[];
  }

  const nextItems = sortTodoItems(items);

  try {
    window.localStorage.setItem(
      getLocalTodoStorageKey(userId),
      JSON.stringify(nextItems)
    );
  } catch {
    // Ignore local storage write failures and keep the in-memory state.
  }

  return nextItems;
}

export function getNextTodoSortOrder(items: ClientTodoItem[]) {
  return items.reduce((highest, item) => Math.max(highest, item.sort_order), -1) + 1;
}

export function createLocalTodo(
  userId: string,
  label: string,
  options?: {
    sortOrder?: number;
    source?: string;
    done?: boolean;
    dueDate?: string | null;
    note?: string | null;
  }
) {
  const nowIso = new Date().toISOString();

  return {
    id: buildLocalTodoId(),
    user_id: userId,
    label,
    done: options?.done ?? false,
    due_date: options?.dueDate ?? null,
    sort_order: options?.sortOrder ?? 0,
    note: options?.note ?? null,
    source: options?.source ?? "manual",
    created_at: nowIso,
    updated_at: nowIso,
  } satisfies ClientTodoItem;
}

export function mergeLocalTodoLabels(
  userId: string,
  labels: readonly string[],
  source = "summary"
) {
  const currentItems = readLocalTodos(userId);
  const existingLabels = new Set(
    currentItems.map((item) => normalizeTodoLabel(item.label))
  );
  const nextSortOrder = getNextTodoSortOrder(currentItems);
  const additions = labels
    .map((label) => label.trim())
    .filter(Boolean)
    .filter((label) => !existingLabels.has(normalizeTodoLabel(label)))
    .map((label, index) =>
      createLocalTodo(userId, label, {
        source,
        sortOrder: nextSortOrder + index,
      })
    );

  return writeLocalTodos(userId, [...currentItems, ...additions]);
}
