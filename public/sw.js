const CACHE_VERSION = "fazumi-v4";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const OFFLINE_FALLBACK_URL = "/offline.html";

const CACHE_LIMITS = {
  [STATIC_CACHE]: 200,
  [PAGE_CACHE]: 50,
  [API_CACHE]: 100,
  [IMAGE_CACHE]: 100,
};

const INSTALL_ASSETS = [
  "/",
  "/favicon.ico",
  "/manifest.json",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/maskable-icon-512.png",
  OFFLINE_FALLBACK_URL,
];

function isSuccessfulResponse(response) {
  return response && (response.ok || response.type === "opaque");
}

async function trimCache(cacheName) {
  const maxItems = CACHE_LIMITS[cacheName];

  if (!maxItems) {
    return;
  }

  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  while (keys.length > maxItems) {
    const oldest = keys.shift();

    if (!oldest) {
      break;
    }

    await cache.delete(oldest);
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (isSuccessfulResponse(response)) {
      await cache.put(request, response.clone());
      await trimCache(cacheName);
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreVary: true });

  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (isSuccessfulResponse(response)) {
    await cache.put(request, response.clone());
    await trimCache(cacheName);
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(INSTALL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all([
        ...keys
          .filter((key) => key.startsWith("fazumi-") && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key)),
        ...Object.keys(CACHE_LIMITS).map((cacheName) => trimCache(cacheName)),
      ])
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Exclude authenticated routes from caching (security: prevent data exposure on shared devices)
  const excludedPaths = [
    '/api/',
    '/dashboard',
    '/history',
    '/billing',
    '/settings',
    '/profile',
    '/calendar',
    '/todo',
    '/admin_dashboard',
  ];

  const shouldExclude = excludedPaths.some(path => url.pathname.startsWith(path));
  if (shouldExclude) {
    // Network-only for authenticated routes
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, PAGE_CACHE).catch(async () => {
        const cached = await caches.match(request, { ignoreVary: true });
        if (cached) {
          return cached;
        }

        return (
          (await caches.match(OFFLINE_FALLBACK_URL, { ignoreVary: true })) ||
          Response.error()
        );
      })
    );
    return;
  }

  // API responses: network-only (don't cache potentially sensitive data)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font"
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  }
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json() ?? {
    title: "Fazumi update",
    body: "Your latest summaries are ready.",
    url: "/dashboard",
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/apple-touch-icon.png",
      badge: "/apple-touch-icon.png",
      tag: payload.id ?? "fazumi-notification",
      data: {
        url: payload.url ?? "/dashboard",
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const targetUrl = new URL(event.notification.data?.url ?? "/dashboard", self.location.origin).href;

      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
