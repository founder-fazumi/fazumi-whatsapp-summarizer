const REDACTED_VALUE = "[REDACTED]";
const SENSITIVE_KEY_TOKENS = [
  "text",
  "message",
  "messages",
  "raw",
  "body",
  "payload",
  "content",
  "chat",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function normalizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase();
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);

  return SENSITIVE_KEY_TOKENS.some((token) => (
    normalized === token ||
    normalized.startsWith(`${token}_`) ||
    normalized.endsWith(`_${token}`) ||
    normalized.includes(`_${token}_`)
  ));
}

export function redact<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const redactedEntries = Object.entries(value).map(([key, entryValue]) => [
    key,
    isSensitiveKey(key) ? REDACTED_VALUE : redact(entryValue),
  ]);

  return Object.fromEntries(redactedEntries) as T;
}
