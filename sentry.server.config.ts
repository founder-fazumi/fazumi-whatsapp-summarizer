import * as Sentry from "@sentry/nextjs";
import { getSentryOptions } from "@/lib/sentry";

Sentry.init(getSentryOptions("server") as Parameters<typeof Sentry.init>[0]);
