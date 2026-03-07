export type FamilyGroupType =
  | "class"
  | "grade"
  | "school"
  | "activity"
  | "transport"
  | "other";

export type SupportedCurrency =
  | "QAR"
  | "SAR"
  | "AED"
  | "KWD"
  | "BHD"
  | "OMR"
  | "USD";

export interface FamilyContext {
  school_name: string | null;
  child_name: string | null;
  class_name: string | null;
  teacher_names: string[];
  group_type: FamilyGroupType | null;
  recurring_links: string[];
  preferred_currency: SupportedCurrency | null;
}

const VALID_GROUP_TYPES = new Set<FamilyGroupType>([
  "class",
  "grade",
  "school",
  "activity",
  "transport",
  "other",
]);

const VALID_CURRENCIES = new Set<SupportedCurrency>([
  "QAR",
  "SAR",
  "AED",
  "KWD",
  "BHD",
  "OMR",
  "USD",
]);

function cleanString(value: unknown, maxLength = 120) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null;
}

function cleanStringArray(value: unknown, maxItems = 8, maxLength = 160) {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  const cleaned: string[] = [];

  for (const item of value) {
    const normalized = cleanString(item, maxLength);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (unique.has(key)) {
      continue;
    }

    unique.add(key);
    cleaned.push(normalized);

    if (cleaned.length >= maxItems) {
      break;
    }
  }

  return cleaned;
}

export function getEmptyFamilyContext(): FamilyContext {
  return {
    school_name: null,
    child_name: null,
    class_name: null,
    teacher_names: [],
    group_type: null,
    recurring_links: [],
    preferred_currency: null,
  };
}

export function normalizeFamilyContext(value: unknown): FamilyContext {
  const record = typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

  const groupType = cleanString(record.group_type, 32);
  const preferredCurrency = cleanString(record.preferred_currency, 16)?.toUpperCase() ?? null;

  return {
    school_name: cleanString(record.school_name),
    child_name: cleanString(record.child_name),
    class_name: cleanString(record.class_name),
    teacher_names: cleanStringArray(record.teacher_names),
    group_type:
      groupType && VALID_GROUP_TYPES.has(groupType as FamilyGroupType)
        ? (groupType as FamilyGroupType)
        : null,
    recurring_links: cleanStringArray(record.recurring_links, 6, 220),
    preferred_currency:
      preferredCurrency && VALID_CURRENCIES.has(preferredCurrency as SupportedCurrency)
        ? (preferredCurrency as SupportedCurrency)
        : null,
  };
}

export function familyContextHasSignal(context: FamilyContext) {
  return Boolean(
    context.school_name ||
      context.child_name ||
      context.class_name ||
      context.group_type ||
      context.preferred_currency ||
      context.teacher_names.length > 0 ||
      context.recurring_links.length > 0
  );
}

export function buildFamilyContextPrompt(context: FamilyContext) {
  if (!familyContextHasSignal(context)) {
    return null;
  }

  const lines = [
    context.school_name ? `- School: ${context.school_name}` : null,
    context.child_name ? `- Child: ${context.child_name}` : null,
    context.class_name ? `- Class or grade: ${context.class_name}` : null,
    context.group_type ? `- Group type: ${context.group_type}` : null,
    context.preferred_currency ? `- Preferred currency: ${context.preferred_currency}` : null,
    context.teacher_names.length > 0 ? `- Known teachers: ${context.teacher_names.join(", ")}` : null,
    context.recurring_links.length > 0 ? `- Recurring school links: ${context.recurring_links.join(", ")}` : null,
  ].filter((line): line is string => Boolean(line));

  if (lines.length === 0) {
    return null;
  }

  return ["Saved family context:", ...lines].join("\n");
}

export function normalizeSummaryRetentionDays(value: unknown): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  if (rounded === 30 || rounded === 90 || rounded === 365) {
    return rounded;
  }

  return null;
}
