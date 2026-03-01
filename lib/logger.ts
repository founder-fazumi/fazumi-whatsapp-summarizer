import { createHash, randomUUID } from "node:crypto";
import { redact } from "@/lib/redact";

type LogLevel = "info" | "warn" | "error";
type LogData = Record<string, unknown>;

export function hashIdentifier(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function getRequestId(headers: Headers): string {
  return (
    headers.get("x-request-id") ??
    headers.get("x-vercel-id") ??
    randomUUID()
  );
}

export function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(redact(error));
  } catch {
    return String(error);
  }
}

function writeLog(level: LogLevel, event: string, base: LogData, data: LogData) {
  const merged = redact({ ...base, ...data }) as LogData;
  const userId = typeof merged.userId === "string" ? merged.userId : null;

  if (userId) {
    delete merged.userId;
    merged.userIdHash = hashIdentifier(userId);
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...merged,
  };

  const method =
    level === "info" ? console.info :
    level === "warn" ? console.warn :
    console.error;

  method(JSON.stringify(entry));
}

export function createRouteLogger(base: LogData) {
  return {
    info(event: string, data: LogData = {}) {
      writeLog("info", event, base, data);
    },
    warn(event: string, data: LogData = {}) {
      writeLog("warn", event, base, data);
    },
    error(event: string, data: LogData = {}) {
      writeLog("error", event, base, data);
    },
  };
}
