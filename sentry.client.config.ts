import * as Sentry from "@sentry/nextjs";
import { getSentryOptions } from "@/lib/sentry";

Sentry.init(getSentryOptions("client") as Parameters<typeof Sentry.init>[0]);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
