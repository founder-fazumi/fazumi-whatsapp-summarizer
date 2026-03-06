import type * as Sentry from "@sentry/nextjs";
import { validateServerRuntimeEnv } from "@/lib/config/server";

const sentryEnabled = Boolean(
  process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
);

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    validateServerRuntimeEnv();
  }

  if (!sentryEnabled) {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError: typeof Sentry.captureRequestError = (
  error,
  request,
  errorContext
) => {
  if (!sentryEnabled) {
    return;
  }

  void import("@sentry/nextjs")
    .then(({ captureRequestError }) => {
      captureRequestError(error, request, errorContext);
    })
    .catch(() => {
      // Ignore Sentry transport/setup failures in the request error hook.
    });
};
