"use client";

import type { WebPushSubscriptionPayload } from "@/lib/push/types";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const SERVICE_WORKER_ENABLED = process.env.NODE_ENV === "production";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function toSubscriptionPayload(subscription: PushSubscription): WebPushSubscriptionPayload {
  const serialized = subscription.toJSON();

  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: {
      auth: serialized.keys?.auth ?? "",
      p256dh: serialized.keys?.p256dh ?? "",
    },
  };
}

async function getServiceWorkerRegistration() {
  const existingRegistration = await navigator.serviceWorker.getRegistration();

  if (existingRegistration) {
    return existingRegistration;
  }

  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export function supportsPushNotifications() {
  return (
    SERVICE_WORKER_ENABLED &&
    typeof window !== "undefined" &&
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator &&
    VAPID_PUBLIC_KEY.length > 0
  );
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!supportsPushNotifications()) {
    return "denied";
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    await subscribeToPush();
  }

  return permission;
}

export async function subscribeToPush() {
  if (!supportsPushNotifications()) {
    return null;
  }

  const registration = await getServiceWorkerRegistration();
  await navigator.serviceWorker.ready;

  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscription: toSubscriptionPayload(subscription),
      timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    }),
  });

  if (!response.ok) {
    throw new Error("Could not save push subscription.");
  }

  return subscription;
}

export async function unsubscribeFromPush() {
  if (!supportsPushNotifications()) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return false;
  }

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint }),
  });

  return true;
}
