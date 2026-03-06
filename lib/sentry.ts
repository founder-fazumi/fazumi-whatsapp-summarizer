import type * as Sentry from "@sentry/nextjs";
import { redact } from "@/lib/redact";

type SentryLike = Record<string, unknown>;
type SentryModule = Pick<typeof Sentry, "captureException" | "flush">;

const sentryEnabled = Boolean(
  process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
);

let sentryModulePromise: Promise<SentryModule | null> | null = null;

async function getSentryModule() {
  if (!sentryEnabled) {
    return null;
  }

  if (!sentryModulePromise) {
    sentryModulePromise = import("@sentry/nextjs")
      .then((module) => ({
        captureException: module.captureException,
        flush: module.flush,
      }))
      .catch(() => null);
  }

  return sentryModulePromise;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function sanitizeRequest(request: unknown): unknown {
  if (!isPlainObject(request)) {
    return request;
  }

  const sanitized = { ...request };
  delete sanitized.cookies;
  delete sanitized.data;
  delete sanitized.headers;

  if (typeof sanitized.url === "string") {
    sanitized.url = sanitized.url.split("?")[0];
  }

  return sanitized;
}

export function sanitizeSentryBreadcrumb<T extends SentryLike | null>(breadcrumb: T): T {
  if (!breadcrumb) {
    return breadcrumb;
  }

  const sanitized = { ...breadcrumb } as SentryLike;

  if ("data" in sanitized) {
    sanitized.data = redact(sanitized.data);
  }

  const category = typeof sanitized.category === "string" ? sanitized.category : "";
  if (
    (category.includes("fetch") || category.includes("http") || category.includes("xhr")) &&
    "message" in sanitized
  ) {
    delete sanitized.message;
  }

  return sanitized as T;
}

export function sanitizeSentryEvent<T extends SentryLike | null>(event: T): T {
  if (!event) {
    return event;
  }

  const sanitized = { ...event } as SentryLike;
  delete sanitized.user;

  if ("request" in sanitized) {
    sanitized.request = sanitizeRequest(sanitized.request);
  }

  if ("extra" in sanitized) {
    sanitized.extra = redact(sanitized.extra);
  }

  if ("contexts" in sanitized) {
    sanitized.contexts = redact(sanitized.contexts);
  }

  if (Array.isArray(sanitized.breadcrumbs)) {
    sanitized.breadcrumbs = sanitized.breadcrumbs.map((breadcrumb) =>
      sanitizeSentryBreadcrumb(
        isPlainObject(breadcrumb) ? breadcrumb : null
      )
    );
  }

  return sanitized as T;
}

export function getSentryOptions(runtime: "client" | "server" | "edge") {
  const dsn =
    runtime === "client"
      ? process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN
      : process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend(event: unknown) {
      return sanitizeSentryEvent(event as SentryLike | null) as typeof event;
    },
    beforeBreadcrumb(breadcrumb: unknown) {
      return sanitizeSentryBreadcrumb(breadcrumb as SentryLike | null) as typeof breadcrumb;
    },
    initialScope: {
      tags: {
        runtime,
      },
    },
  };
}

type CaptureContext = {
  route: string;
  requestId: string;
  userId?: string | null;
  summaryId?: string | null;
  errorCode?: string;
  statusCode?: number;
  [key: string]: unknown;
};

export async function captureRouteException(error: unknown, context: CaptureContext) {
  const sentry = await getSentryModule();
  if (!sentry) {
    return;
  }

  const { route, userId, errorCode, ...extraSource } = context;
  void userId;
  const extra = redact(extraSource) as Record<string, unknown>;

  sentry.captureException(
    error instanceof Error ? error : new Error(String(error)),
    {
      level: "error",
      tags: {
        route,
        ...(errorCode ? { errorCode } : {}),
      },
      extra,
    }
  );

  if (typeof sentry.flush === "function") {
    await sentry.flush(2000);
  }
}
