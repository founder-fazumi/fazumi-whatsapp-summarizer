"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { useLang } from "@/lib/context/LangContext";
import {
  requestNotificationPermission,
  supportsPushNotifications,
} from "@/lib/pushNotifications";

const VISITS_KEY = "fazumi_notification_visits";
const PERMISSION_KEY = "fazumi_notification_permission";
const DISMISS_KEY = "fazumi_notification_prompt_dismissed_at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24;

const COPY = {
  en: {
    title: "Enable autopilot-lite",
    body: "Get a morning digest, urgent school alerts, and reminder nudges when new family actions are detected.",
    enable: "Enable notifications",
    later: "Maybe later",
    dismiss: "Dismiss notification prompt",
  },
  ar: {
    title: "فعّل الطيار الآلي الخفيف",
    body: "احصل على ملخص صباحي وتنبيهات مدرسية عاجلة وتذكيرات عندما يكتشف Fazumi إجراءات عائلية جديدة.",
    enable: "فعّل الإشعارات",
    later: "لاحقًا",
    dismiss: "إغلاق نافذة الإشعارات",
  },
} as const;

export function NotificationPrompt() {
  const { locale } = useLang();
  const copy = COPY[locale];
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "default";
    }

    return Notification.permission;
  });
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!supportsPushNotifications()) {
      return;
    }

    const notificationPermission = Notification.permission;

    if (notificationPermission !== "default") {
      localStorage.setItem(PERMISSION_KEY, notificationPermission);
      return;
    }

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) {
      return;
    }

    const visits = Number(localStorage.getItem(VISITS_KEY) ?? "0") + 1;
    localStorage.setItem(VISITS_KEY, String(visits));

    if (visits < 2) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowPrompt(true);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  async function handleEnable() {
    const result = await requestNotificationPermission();
    setPermission(result);
    setShowPrompt(false);
    localStorage.setItem(PERMISSION_KEY, result);

    if (result === "granted") {
      trackEvent(AnalyticsEvents.NOTIFICATION_ENABLED, {
        source: "dashboard_prompt",
      });
    }
  }

  function handleDismiss() {
    setShowPrompt(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    trackEvent(AnalyticsEvents.NOTIFICATION_DISMISSED, {
      source: "dashboard_prompt",
    });
  }

  if (!showPrompt || permission === "granted") {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-20 z-50 flex justify-center md:bottom-4">
      <div className="flex w-full max-w-md items-start gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-[var(--shadow-lg)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)]">
          <Bell className="h-5 w-5 text-[var(--primary)]" />
        </div>

        <div className="min-w-0 flex-1" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            {copy.title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
            {copy.body}
          </p>

          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void handleEnable()}>
              {copy.enable}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              {copy.later}
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-full p-1 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          aria-label={copy.dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
