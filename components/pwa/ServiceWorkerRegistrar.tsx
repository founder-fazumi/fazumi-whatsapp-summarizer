"use client";

import { useEffect } from "react";

const FAZUMI_CACHE_PREFIX = "fazumi-";
const CHUNK_RELOAD_GUARD_KEY = "fazumi_chunk_reload_once";

function isChunkLoadFailure(reason: unknown) {
  if (reason instanceof Error) {
    const message = `${reason.name} ${reason.message}`.toLowerCase();
    return message.includes("chunkloaderror") || message.includes("loading chunk");
  }

  if (typeof reason === "string") {
    const message = reason.toLowerCase();
    return message.includes("chunkloaderror") || message.includes("loading chunk");
  }

  if (typeof reason === "object" && reason !== null && "message" in reason) {
    const messageValue = (reason as { message?: unknown }).message;
    if (typeof messageValue === "string") {
      const message = messageValue.toLowerCase();
      return message.includes("chunkloaderror") || message.includes("loading chunk");
    }
  }

  return false;
}

function reloadOnceForChunkFailure() {
  if (typeof window === "undefined") {
    return;
  }

  if (sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) === "1") {
    return;
  }

  sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, "1");
  window.location.reload();
}

async function unregisterFazumiServiceWorker(clearAllCaches: boolean) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map((registration) =>
      registration.unregister().catch(() => false)
    )
  );

  if (!("caches" in window)) {
    return;
  }

  const cacheKeys = await caches.keys();
  const keysToDelete = clearAllCaches
    ? cacheKeys
    : cacheKeys.filter((key) => key.startsWith(FAZUMI_CACHE_PREFIX));

  await Promise.all(
    keysToDelete.map((key) => caches.delete(key).catch(() => false))
  );
}

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    const pwaEnabled = process.env.NODE_ENV === "production";
    sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY);

    const onWindowError = (event: ErrorEvent) => {
      if (isChunkLoadFailure(event.error ?? event.message)) {
        reloadOnceForChunkFailure();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadFailure(event.reason)) {
        reloadOnceForChunkFailure();
      }
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      return;
    }

    if (!pwaEnabled) {
      void unregisterFazumiServiceWorker(true);
    } else {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => registration.update().catch(() => undefined))
        .catch(() => {
          // Keep failures silent in the UI; the app should still work online.
        });
    }

    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
