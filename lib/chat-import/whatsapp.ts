const INVISIBLE_CHAR_PATTERN = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;
const ARABIC_DIGIT_PATTERN = /[٠-٩۰-۹]/g;

const ARABIC_DIGITS: Record<string, string> = {
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
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

type DateOrder = "mdy" | "dmy" | "ymd";

export type SummarizeZipRange = "24h" | "7d";

export interface ParsedChatMessage {
  ts: Date;
  tsIso: string;
  sender: string;
  senderNormalized: string;
  body: string;
  bodyNormalized: string;
}

interface TimestampPrefix {
  datePart: string;
  timePart: string;
  rest: string;
}

function normalizeArabicDigits(value: string) {
  return value.replace(ARABIC_DIGIT_PATTERN, (char) => ARABIC_DIGITS[char] ?? char);
}

function normalizeMeridiem(value: string) {
  return value
    .replace(/\b(?:am|a\.m\.)\b/gi, "AM")
    .replace(/\b(?:pm|p\.m\.)\b/gi, "PM")
    .replace(/صباحًا|صباحا|ص\b/gi, "AM")
    .replace(/مساءً|مساءا|م\b/gi, "PM");
}

function normalizeForParsing(value: string) {
  return normalizeMeridiem(
    normalizeArabicDigits(
      value
        .normalize("NFKC")
        .replace(/\r\n?/g, "\n")
        .replace(INVISIBLE_CHAR_PATTERN, "")
        .replace(/[،]/g, ",")
        .replace(/[﹣－–—]/g, "-")
        .replace(/\u202F/g, " ")
    )
  );
}

export function normalizeDisplayText(value: string) {
  return value
    .normalize("NFKC")
    .replace(INVISIBLE_CHAR_PATTERN, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, index, lines) => line.length > 0 || (index > 0 && index < lines.length - 1))
    .join("\n")
    .trim();
}

export function normalizeComparableText(value: string) {
  return normalizeDisplayText(value)
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function inferGroupLabelFromFilename(fileName: string) {
  const normalized = fileName
    .split(/[\\/]/)
    .pop()
    ?.replace(/\.[^.]+$/u, "")
    .replace(/[_-]+/g, " ")
    .trim();

  return normalized && normalized.length > 0 ? normalized : "Chat group";
}

export function normalizeGroupKey(value: string) {
  const slug = normalizeComparableText(value)
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "chat-group";
}

function extractTimestampPrefix(line: string): TimestampPrefix | null {
  const bracketMatch = line.match(/^\[(?<date>[^\],]+),\s*(?<time>[^\]]+)\]\s*(?<rest>.+)$/u);
  if (bracketMatch?.groups) {
    return {
      datePart: bracketMatch.groups.date.trim(),
      timePart: bracketMatch.groups.time.trim(),
      rest: bracketMatch.groups.rest.trim(),
    };
  }

  const dashMatch = line.match(
    /^(?<date>\d{1,4}[\/.-]\d{1,2}[\/.-]\d{2,4}),\s*(?<time>.+?)\s+-\s+(?<rest>.+)$/u
  );
  if (dashMatch?.groups) {
    return {
      datePart: dashMatch.groups.date.trim(),
      timePart: dashMatch.groups.time.trim(),
      rest: dashMatch.groups.rest.trim(),
    };
  }

  return null;
}

function splitSenderAndBody(rest: string) {
  const separatorIndex = rest.search(/[:：]/u);
  if (separatorIndex <= 0) {
    return null;
  }

  const sender = rest.slice(0, separatorIndex).trim();
  const body = rest.slice(separatorIndex + 1).trim();

  if (!sender || !body) {
    return null;
  }

  return { sender, body };
}

function parseYear(value: number) {
  if (value >= 100) {
    return value;
  }

  return value >= 70 ? 1900 + value : 2000 + value;
}

function parseTime(timePart: string) {
  const normalized = normalizeForParsing(timePart)
    .replace(/\s+/g, " ")
    .trim();
  const match = normalized.match(
    /^(?<hour>\d{1,2}):(?<minute>\d{2})(?::(?<second>\d{2}))?(?:\s*(?<meridiem>AM|PM))?$/i
  );

  if (!match?.groups) {
    return null;
  }

  let hour = Number.parseInt(match.groups.hour, 10);
  const minute = Number.parseInt(match.groups.minute, 10);
  const second = Number.parseInt(match.groups.second ?? "0", 10);
  const meridiem = match.groups.meridiem?.toUpperCase();

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second) ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  if (meridiem) {
    if (hour < 1 || hour > 12) {
      return null;
    }

    if (meridiem === "AM") {
      hour = hour === 12 ? 0 : hour;
    } else {
      hour = hour === 12 ? 12 : hour + 12;
    }
  } else if (hour > 23) {
    return null;
  }

  return { hour, minute, second };
}

function detectDateOrder(text: string) {
  const normalized = normalizeForParsing(text);
  let monthFirstVotes = 0;
  let dayFirstVotes = 0;

  for (const line of normalized.split("\n")) {
    const prefix = extractTimestampPrefix(line);
    if (!prefix) {
      continue;
    }

    const parts = prefix.datePart
      .split(/[\/.-]/)
      .map((part) => Number.parseInt(part, 10))
      .filter((part) => Number.isFinite(part));

    if (parts.length !== 3) {
      continue;
    }

    if (String(parts[0]).length === 4) {
      return "ymd";
    }

    const [first, second] = parts;
    if (first > 12 && second <= 12) {
      dayFirstVotes += 1;
    } else if (second > 12 && first <= 12) {
      monthFirstVotes += 1;
    }
  }

  return dayFirstVotes > monthFirstVotes ? "dmy" : "mdy";
}

function parseTimestamp(datePart: string, timePart: string, dateOrder: DateOrder) {
  const dateTokens = normalizeForParsing(datePart)
    .split(/[\/.-]/)
    .map((token) => Number.parseInt(token, 10));
  if (dateTokens.length !== 3 || dateTokens.some((token) => !Number.isFinite(token))) {
    return null;
  }

  const parsedTime = parseTime(timePart);
  if (!parsedTime) {
    return null;
  }

  let year = 0;
  let month = 0;
  let day = 0;

  if (dateOrder === "ymd" || String(dateTokens[0]).length === 4) {
    [year, month, day] = dateTokens;
  } else if (dateOrder === "dmy") {
    [day, month, year] = dateTokens;
  } else {
    [month, day, year] = dateTokens;
  }

  year = parseYear(year);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const ts = new Date(Date.UTC(
    year,
    month - 1,
    day,
    parsedTime.hour,
    parsedTime.minute,
    parsedTime.second
  ));

  if (Number.isNaN(ts.getTime())) {
    return null;
  }

  return ts;
}

export function parseWhatsAppExport(text: string): ParsedChatMessage[] {
  const normalizedText = normalizeForParsing(text);
  const dateOrder = detectDateOrder(normalizedText);
  const messages: ParsedChatMessage[] = [];

  let current:
    | {
      ts: Date;
      sender: string;
      bodyParts: string[];
    }
    | null = null;

  function flushCurrent() {
    if (!current) {
      return;
    }

    const sender = normalizeDisplayText(current.sender);
    const body = normalizeDisplayText(current.bodyParts.join("\n"));
    if (!sender || !body) {
      current = null;
      return;
    }

    messages.push({
      ts: current.ts,
      tsIso: current.ts.toISOString(),
      sender,
      senderNormalized: normalizeComparableText(sender),
      body,
      bodyNormalized: normalizeComparableText(body),
    });

    current = null;
  }

  for (const rawLine of normalizedText.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      if (current) {
        current.bodyParts.push("");
      }
      continue;
    }

    const prefix = extractTimestampPrefix(line);
    if (prefix) {
      const senderAndBody = splitSenderAndBody(prefix.rest);
      const ts = senderAndBody
        ? parseTimestamp(prefix.datePart, prefix.timePart, dateOrder)
        : null;

      if (senderAndBody && ts) {
        flushCurrent();
        current = {
          ts,
          sender: senderAndBody.sender,
          bodyParts: [senderAndBody.body],
        };
        continue;
      }
    }

    if (current) {
      current.bodyParts.push(line);
    }
  }

  flushCurrent();
  return messages;
}

