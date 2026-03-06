export interface AppHealthSnapshot {
  ok: boolean;
  app: string;
  env: {
    supabase: boolean;
    serviceRole: boolean;
    openai: boolean;
    lemonsqueezy: boolean;
  };
  envConfigured: boolean;
  timestamp: string;
  supabase: boolean;
  critical: {
    profiles: boolean;
    summaries: boolean;
    subscriptions: boolean;
    usageDaily: boolean;
    incrementUsageDailyAtomic: boolean;
    incrementLifetimeFreeAtomic: boolean;
  };
  schema: {
    profiles: boolean;
    summaries: boolean;
    subscriptions: boolean;
    usageDaily: boolean;
    userTodos: boolean;
    pushSubscriptions: boolean;
    userConsents: boolean;
    aiRequestLogs: boolean;
    marketingSpend: boolean;
  };
  rpcs: {
    incrementUsageDailyAtomic: boolean;
    incrementLifetimeFreeAtomic: boolean;
  };
}

const FALLBACK_HEALTH: AppHealthSnapshot = {
  ok: false,
  app: "fazumi-web",
  env: {
    supabase: false,
    serviceRole: false,
    openai: false,
    lemonsqueezy: false,
  },
  envConfigured: false,
  timestamp: new Date(0).toISOString(),
  supabase: false,
  critical: {
    profiles: false,
    summaries: false,
    subscriptions: false,
    usageDaily: false,
    incrementUsageDailyAtomic: false,
    incrementLifetimeFreeAtomic: false,
  },
  schema: {
    profiles: false,
    summaries: false,
    subscriptions: false,
    usageDaily: false,
    userTodos: false,
    pushSubscriptions: false,
    userConsents: false,
    aiRequestLogs: false,
    marketingSpend: false,
  },
  rpcs: {
    incrementUsageDailyAtomic: false,
    incrementLifetimeFreeAtomic: false,
  },
};

let cachedHealthSnapshot: AppHealthSnapshot | null = null;
let healthRequest: Promise<AppHealthSnapshot> | null = null;

export function getTodoStorageMode(health: AppHealthSnapshot | null | undefined) {
  return health?.schema.userTodos ? "remote" as const : "local" as const;
}

export async function getClientHealthSnapshot() {
  if (cachedHealthSnapshot) {
    return cachedHealthSnapshot;
  }

  if (!healthRequest) {
    healthRequest = fetch("/api/health", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) {
          return FALLBACK_HEALTH;
        }

        const payload = (await response.json()) as Partial<AppHealthSnapshot>;
        const snapshot: AppHealthSnapshot = {
          ...FALLBACK_HEALTH,
          ...payload,
          env: {
            ...FALLBACK_HEALTH.env,
            ...(payload.env ?? {}),
          },
          critical: {
            ...FALLBACK_HEALTH.critical,
            ...(payload.critical ?? {}),
          },
          schema: {
            ...FALLBACK_HEALTH.schema,
            ...(payload.schema ?? {}),
          },
          rpcs: {
            ...FALLBACK_HEALTH.rpcs,
            ...(payload.rpcs ?? {}),
          },
        };
        cachedHealthSnapshot = snapshot;
        return snapshot;
      })
      .catch(() => FALLBACK_HEALTH)
      .finally(() => {
        healthRequest = null;
      });
  }

  return healthRequest;
}
