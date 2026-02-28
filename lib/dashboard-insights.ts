const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 30;
const MAX_CALENDAR_ITEMS = 6;
const MAX_TODO_ITEMS = 6;
const MAX_NOTIFICATIONS = 3;

const ARABIC_DIGIT_MAP: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

const MONTH_INDEX_BY_NAME: Record<string, number> = {
  jan: 0,
  january: 0,
  "يناير": 0,
  feb: 1,
  february: 1,
  "فبراير": 1,
  mar: 2,
  march: 2,
  "مارس": 2,
  apr: 3,
  april: 3,
  "ابريل": 3,
  "أبريل": 3,
  may: 4,
  "مايو": 4,
  jun: 5,
  june: 5,
  "يونيو": 5,
  jul: 6,
  july: 6,
  "يوليو": 6,
  aug: 7,
  august: 7,
  "اغسطس": 7,
  "أغسطس": 7,
  sep: 8,
  sept: 8,
  september: 8,
  "سبتمبر": 8,
  oct: 9,
  october: 9,
  "اكتوبر": 9,
  "أكتوبر": 9,
  nov: 10,
  november: 10,
  "نوفمبر": 10,
  dec: 11,
  december: 11,
  "ديسمبر": 11,
};

export interface SummaryInsightRow {
  id: string;
  created_at: string;
  important_dates: string[] | null;
  action_items: string[] | null;
}

export interface CalendarInsightItem {
  id: string;
  summaryId: string;
  label: string;
  createdAt: string;
  isoDate: string | null;
  dateKey: string | null;
}

export interface TodoInsightItem {
  id: string;
  summaryId: string;
  label: string;
  createdAt: string;
}

export interface NotificationInsightItem {
  id: string;
  label: string;
  createdAt: string;
  isoDate: string | null;
}

export interface DashboardInsights {
  calendarItems: CalendarInsightItem[];
  todoItems: TodoInsightItem[];
  notifications: NotificationInsightItem[];
}

export const EMPTY_DASHBOARD_INSIGHTS: DashboardInsights = {
  calendarItems: [],
  todoItems: [],
  notifications: [],
};

function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (char) => ARABIC_DIGIT_MAP[char] ?? char);
}

function normalizeDateText(value: string): string {
  return normalizeDigits(value)
    .replace(/[\u200e\u200f]/g, "")
    .replace(/[،]/g, ",")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildUtcDate(year: number, monthIndex: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function resolveYear(monthIndex: number, day: number, now: Date, explicitYear?: number): Date | null {
  const nowUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  const baseYear = explicitYear ?? nowUtc.getUTCFullYear();
  let candidate = buildUtcDate(baseYear, monthIndex, day);

  if (!candidate) {
    return null;
  }

  if (!explicitYear && candidate.getTime() < nowUtc.getTime() - 31 * DAY_MS) {
    candidate = buildUtcDate(baseYear + 1, monthIndex, day);
  }

  return candidate;
}

function parseMonthNameDate(text: string, now: Date): Date | null {
  const tokens = normalizeDateText(text)
    .replace(/[.,]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const monthTokenIndex = tokens.findIndex((token) => MONTH_INDEX_BY_NAME[token] !== undefined);
  if (monthTokenIndex === -1) {
    return null;
  }

  const monthIndex = MONTH_INDEX_BY_NAME[tokens[monthTokenIndex]];
  if (monthIndex === undefined) {
    return null;
  }
  const before = tokens[monthTokenIndex - 1];
  const after = tokens[monthTokenIndex + 1];
  const afterNext = tokens[monthTokenIndex + 2];
  const beforePrev = tokens[monthTokenIndex - 2];

  const dayCandidate = [before, after]
    .map((token) => Number(token))
    .find((value) => Number.isInteger(value) && value >= 1 && value <= 31);

  if (!dayCandidate) {
    return null;
  }

  const yearCandidate = [afterNext, beforePrev, after, before]
    .map((token) => Number(token))
    .find((value) => Number.isInteger(value) && value >= 2000 && value <= 2100);

  return resolveYear(monthIndex, dayCandidate, now, yearCandidate);
}

function parseNumericDate(text: string, now: Date): Date | null {
  const normalized = normalizeDateText(text);
  const isoMatch = normalized.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);

  if (isoMatch) {
    return buildUtcDate(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const slashMatch = normalized.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/);
  if (!slashMatch) {
    return null;
  }

  const first = Number(slashMatch[1]);
  const second = Number(slashMatch[2]);
  const year =
    slashMatch[3] && Number(slashMatch[3]) < 100
      ? 2000 + Number(slashMatch[3])
      : slashMatch[3]
        ? Number(slashMatch[3])
        : undefined;

  const monthFirst = first > 12;
  const day = monthFirst ? first : second;
  const monthIndex = (monthFirst ? second : first) - 1;

  return resolveYear(monthIndex, day, now, year);
}

function parseDateFromLabel(label: string, now: Date): Date | null {
  return parseNumericDate(label, now) ?? parseMonthNameDate(label, now);
}

function uniqueByLabel<T extends { label: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const item of items) {
    const key = item.label.trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(item);
  }

  return unique;
}

function isRecentSummary(createdAt: string, now: Date): boolean {
  const created = new Date(createdAt);
  return !Number.isNaN(created.getTime()) && created.getTime() >= now.getTime() - RECENT_WINDOW_DAYS * DAY_MS;
}

export function buildDashboardInsights(
  rows: SummaryInsightRow[],
  now = new Date()
): DashboardInsights {
  const calendarItems = uniqueByLabel(
    rows
      .filter((row) => isRecentSummary(row.created_at, now))
      .flatMap((row) =>
        (row.important_dates ?? [])
          .map((label, index) => {
            const parsedDate = parseDateFromLabel(label, now);
            return {
              id: `${row.id}:date:${index}`,
              summaryId: row.id,
              label,
              createdAt: row.created_at,
              isoDate: parsedDate ? parsedDate.toISOString() : null,
              dateKey: parsedDate ? parsedDate.toISOString().slice(0, 10) : null,
            } satisfies CalendarInsightItem;
          })
          .filter((item) => item.label.trim().length > 0)
      )
  )
    .sort((left, right) => {
      if (left.isoDate && right.isoDate) {
        return new Date(left.isoDate).getTime() - new Date(right.isoDate).getTime();
      }
      if (left.isoDate) return -1;
      if (right.isoDate) return 1;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    })
    .slice(0, MAX_CALENDAR_ITEMS);

  const todoItems = uniqueByLabel(
    rows
      .filter((row) => isRecentSummary(row.created_at, now))
      .flatMap((row) =>
        (row.action_items ?? [])
          .map((label, index) => ({
            id: `${row.id}:todo:${index}`,
            summaryId: row.id,
            label,
            createdAt: row.created_at,
          }) satisfies TodoInsightItem)
          .filter((item) => item.label.trim().length > 0)
      )
  )
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, MAX_TODO_ITEMS);

  const notifications = calendarItems
    .filter((item) => {
      if (!item.isoDate) {
        return true;
      }

      const itemTime = new Date(item.isoDate).getTime();
      const todayTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)).getTime();
      return itemTime >= todayTime;
    })
    .slice(0, MAX_NOTIFICATIONS)
    .map((item) => ({
      id: `notification:${item.id}`,
      label: item.label,
      createdAt: item.createdAt,
      isoDate: item.isoDate,
    }) satisfies NotificationInsightItem);

  return {
    calendarItems,
    todoItems,
    notifications,
  };
}
