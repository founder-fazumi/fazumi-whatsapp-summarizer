"use client";

import posthog from "posthog-js";
import { hasConsent } from "@/lib/compliance/gdpr";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";
const SESSION_REPLAY_ENABLED =
  process.env.NEXT_PUBLIC_POSTHOG_SESSION_RECORDING !== "false";

let analyticsInitialized = false;

export const AnalyticsEvents = {
  SUMMARY_CREATED: "summary_created",
  SUMMARY_VIEWED: "summary_viewed",
  ACTIVATION_COMPLETED: "activation_completed",
  WEEKLY_REPEAT_USED: "weekly_repeat_used",
  LIMIT_REACHED: "limit_reached",
  NOTIFICATION_ENABLED: "notification_enabled",
  NOTIFICATION_DISMISSED: "notification_dismissed",
  SOURCE_SELECTED: "source_selected",
  GROUP_SAVED: "group_saved",
  FAMILY_CONTEXT_SAVED: "family_context_saved",
  RETENTION_UPDATED: "retention_updated",
  ACCOUNT_DELETED: "account_deleted",
  PMF_SURVEY_SUBMITTED: "pmf_survey_submitted",
  ACTION_CENTER_USED: "action_center_used",
} as const;

function analyticsConfigured() {
  return typeof window !== "undefined" && POSTHOG_KEY.length > 0;
}

export function analyticsEnabled() {
  return analyticsConfigured() && hasConsent("analytics");
}

export function sessionReplayEnabled() {
  return analyticsConfigured() && SESSION_REPLAY_ENABLED && hasConsent("sessionReplay");
}

export function initAnalytics() {
  const analyticsAllowed = analyticsEnabled();
  const replayAllowed = sessionReplayEnabled();

  if (!analyticsAllowed && !replayAllowed) {
    return null;
  }

  if (analyticsInitialized) {
    return posthog;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    persistence: "localStorage",
    person_profiles: "identified_only",
    disable_session_recording: !replayAllowed,
    session_recording: {
      recordCrossOriginIframes: false,
    },
  });

  analyticsInitialized = true;
  return posthog;
}

export function getAnalyticsClient() {
  if (!analyticsConfigured()) {
    return null;
  }

  if (!analyticsEnabled() && !sessionReplayEnabled()) {
    return null;
  }

  return initAnalytics() ?? posthog;
}

export function trackPageview(path: string) {
  if (!analyticsEnabled()) {
    return;
  }

  const client = getAnalyticsClient();
  if (!client || typeof window === "undefined") {
    return;
  }

  client.capture("$pageview", {
    path,
    url: window.location.href,
  });
}

export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (!analyticsEnabled()) {
    return;
  }

  const client = getAnalyticsClient();
  if (!client) {
    return;
  }

  client.capture(eventName, properties);
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  const client = getAnalyticsClient();
  if (!client) {
    return;
  }

  client.identify(userId, properties);

  if (sessionReplayEnabled()) {
    client.startSessionRecording();
  }
}

export function resetAnalytics() {
  if (!analyticsConfigured() || !analyticsInitialized) {
    return;
  }

  posthog.stopSessionRecording();
  posthog.reset();
  analyticsInitialized = false;
}
