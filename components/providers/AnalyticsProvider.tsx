"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useConsentManager } from "@/components/compliance/ConsentManager";
import {
  initAnalytics,
  resetAnalytics,
  trackPageview,
} from "@/lib/analytics";

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { consent, isReady } = useConsentManager();
  const analyticsAllowed = consent.analytics;
  const replayAllowed = consent.sessionReplay;
  const enabled = isReady && (analyticsAllowed || replayAllowed);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!enabled) {
      resetAnalytics();
      return;
    }

    const client = initAnalytics();

    if (client && replayAllowed) {
      client.startSessionRecording();
    } else if (client) {
      client.stopSessionRecording();
    }

    if (!pathname || !analyticsAllowed) {
      return;
    }

    const queryString = searchParams?.toString() ?? "";
    trackPageview(queryString ? `${pathname}?${queryString}` : pathname);
  }, [analyticsAllowed, enabled, isReady, pathname, replayAllowed, searchParams]);

  if (!enabled) {
    return <>{children}</>;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
