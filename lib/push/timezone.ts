const DEFAULT_TIMEZONE = "UTC";

interface TimeZoneParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

interface TimeZoneDateParts {
  year: number;
  month: number;
  day: number;
}

interface TimeZoneDayRange {
  dateKey: string;
  start: Date;
  end: Date;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getFormatter(timeZone: string) {
  const normalizedTimeZone = normalizeTimeZone(timeZone);
  const cached = formatterCache.get(normalizedTimeZone);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizedTimeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  formatterCache.set(normalizedTimeZone, formatter);
  return formatter;
}

function getNumberPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  const value = parts.find((part) => part.type === type)?.value;
  return Number(value ?? "0");
}

function shiftCalendarDate(parts: TimeZoneDateParts, days: number): TimeZoneDateParts {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function toUtcTimestamp(parts: TimeZoneParts) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
}

export function normalizeTimeZone(timeZone?: string | null) {
  if (!timeZone) {
    return DEFAULT_TIMEZONE;
  }

  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function getTimeZoneParts(date: Date, timeZone?: string | null): TimeZoneParts {
  const formatter = getFormatter(normalizeTimeZone(timeZone));
  const parts = formatter.formatToParts(date);

  return {
    year: getNumberPart(parts, "year"),
    month: getNumberPart(parts, "month"),
    day: getNumberPart(parts, "day"),
    hour: getNumberPart(parts, "hour"),
    minute: getNumberPart(parts, "minute"),
    second: getNumberPart(parts, "second"),
  };
}

export function getTimeZoneDateKey(date: Date, timeZone?: string | null) {
  const parts = getTimeZoneParts(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function getUtcDateForTimeZone(
  parts: TimeZoneParts,
  timeZone?: string | null
) {
  const normalizedTimeZone = normalizeTimeZone(timeZone);
  const utcGuess = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  );
  const localizedGuess = getTimeZoneParts(utcGuess, normalizedTimeZone);
  const offsetMs = toUtcTimestamp(localizedGuess) - utcGuess.getTime();

  return new Date(utcGuess.getTime() - offsetMs);
}

export function getTimeZoneDayRange(
  date: Date,
  timeZone?: string | null,
  dayOffset = 0
): TimeZoneDayRange {
  const normalizedTimeZone = normalizeTimeZone(timeZone);
  const todayParts = getTimeZoneParts(date, normalizedTimeZone);
  const localDate = shiftCalendarDate(todayParts, dayOffset);
  const nextLocalDate = shiftCalendarDate(localDate, 1);

  return {
    dateKey: `${localDate.year}-${pad(localDate.month)}-${pad(localDate.day)}`,
    start: getUtcDateForTimeZone(
      {
        ...localDate,
        hour: 0,
        minute: 0,
        second: 0,
      },
      normalizedTimeZone
    ),
    end: getUtcDateForTimeZone(
      {
        ...nextLocalDate,
        hour: 0,
        minute: 0,
        second: 0,
      },
      normalizedTimeZone
    ),
  };
}
