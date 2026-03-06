const ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const ADMIN_LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

declare global {
  var __fazumiAdminLoginRateLimit: Map<string, RateLimitEntry> | undefined;
}

function getRateLimitStore() {
  if (!globalThis.__fazumiAdminLoginRateLimit) {
    globalThis.__fazumiAdminLoginRateLimit = new Map<string, RateLimitEntry>();
  }

  return globalThis.__fazumiAdminLoginRateLimit;
}

function pruneExpiredEntries(now: number) {
  const store = getRateLimitStore();

  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function consumeAdminLoginRateLimit(ipAddress: string) {
  const now = Date.now();
  const store = getRateLimitStore();
  const key = ipAddress || "unknown";

  pruneExpiredEntries(now);

  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS,
    });

    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= ADMIN_LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

export function resetAdminLoginRateLimit(ipAddress: string) {
  getRateLimitStore().delete(ipAddress || "unknown");
}
