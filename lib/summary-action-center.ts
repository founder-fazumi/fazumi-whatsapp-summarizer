import type { ImportantDate, SummaryResult } from "@/lib/ai/summarize";

export interface ActionCenterBuckets {
  due_today: string[];
  upcoming_dates: string[];
  payments_forms: string[];
  supplies: string[];
  questions: string[];
  urgent_items: string[];
}

const PAYMENT_OR_FORM_PATTERN =
  /\b(pay|payment|fee|fees|tuition|invoice|form|forms|permission|permission slip|slip|portal|register|registration|upload|receipt|qr|qar|sar|aed|kwd|bhd|omr|usd)\b|رسوم|دفع|سداد|فاتورة|استمارة|نموذج|إذن|بوابة|رفع|تسجيل/iu;
const SUPPLIES_PATTERN =
  /\b(bring|send|pack|kit|uniform|bottle|laptop|tablet|book|books|notebook|materials|supplies|stationery|glue|scissors|paper|slides)\b|أحضر|احضر|أرسل|ارسل|حقيبة|زي|زيّ|مستلزمات|دفتر|كتب|شرائح|مياه|صمغ|مقص|ورق/iu;
const TODAY_PATTERN =
  /\b(today|tonight|this morning|this afternoon|this evening|end of day|eod|before school|before class)\b|اليوم|هذه الليلة|هذا المساء|هذا الصباح|قبل الدوام|قبل الحصة/iu;
const TOMORROW_PATTERN =
  /\b(tomorrow|by tomorrow)\b|غدًا|غدا/iu;
const URGENT_PATTERN =
  /\b(urgent|asap|immediately|right away|important reminder)\b|عاجل|فورًا|فورا|حالًا|هام جدًا|مهم جدًا/iu;

function uniqueStrings(items: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const item of items) {
    const normalized = item.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(item.trim());
  }

  return deduped;
}

function getLocalDateKey(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatImportantDate(item: ImportantDate) {
  const meta = [item.time, item.location].filter(Boolean).join(" • ");
  return meta ? `${item.label} (${meta})` : item.label;
}

function isTodayItem(item: ImportantDate, todayKey: string) {
  return item.date === todayKey || (!item.date && TODAY_PATTERN.test(item.label));
}

function isUpcomingItem(item: ImportantDate, todayKey: string) {
  if (item.date) {
    return item.date !== todayKey;
  }

  return !item.urgent;
}

function hasTodaySignal(value: string, todayKey: string) {
  return TODAY_PATTERN.test(value) || value.includes(todayKey);
}

function hasUrgentSignal(value: string, tomorrowKey: string) {
  return URGENT_PATTERN.test(value) || TOMORROW_PATTERN.test(value) || value.includes(tomorrowKey);
}

export function deriveActionCenter(summary: SummaryResult): ActionCenterBuckets {
  const todayKey = getLocalDateKey();
  const tomorrowKey = getLocalDateKey(1);
  const urgentDates = summary.important_dates
    .filter((item) => item.urgent)
    .map(formatImportantDate);
  const dueTodayDates = summary.important_dates
    .filter((item) => isTodayItem(item, todayKey))
    .map(formatImportantDate);
  const upcomingDates = summary.important_dates
    .filter((item) => isUpcomingItem(item, todayKey))
    .map(formatImportantDate);
  const dueTodayActions = summary.action_items.filter((item) => hasTodaySignal(item, todayKey));
  const urgentActions = uniqueStrings([
    ...summary.urgent_action_items,
    ...summary.action_items.filter((item) => hasUrgentSignal(item, tomorrowKey)),
  ]);

  return {
    due_today: uniqueStrings([
      ...dueTodayActions,
      ...dueTodayDates,
      ...(dueTodayActions.length === 0 && dueTodayDates.length === 0 ? summary.urgent_action_items : []),
    ]),
    upcoming_dates: uniqueStrings(upcomingDates),
    payments_forms: uniqueStrings([
      ...summary.action_items.filter((item) => PAYMENT_OR_FORM_PATTERN.test(item)),
      ...summary.links.filter((item) => PAYMENT_OR_FORM_PATTERN.test(item)),
      ...summary.important_dates
        .filter((item) => PAYMENT_OR_FORM_PATTERN.test(item.label))
        .map(formatImportantDate),
    ]),
    supplies: uniqueStrings([
      ...summary.action_items.filter((item) => SUPPLIES_PATTERN.test(item)),
      ...summary.important_dates
        .filter((item) => SUPPLIES_PATTERN.test(item.label))
        .map(formatImportantDate),
    ]),
    questions: uniqueStrings(summary.questions),
    urgent_items: uniqueStrings([
      ...urgentActions,
      ...urgentDates,
    ]),
  };
}
