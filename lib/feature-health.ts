export interface AppHealthSnapshot {
  ok: boolean;
  app: string;
  env: {
    supabase: boolean;
    openai: boolean;
    lemonsqueezy: boolean;
  };
  envConfigured: boolean;
  timestamp: string;
  supabase: boolean;
  schema: {
    profiles: boolean;
    summaries: boolean;
    subscriptions: boolean;
    userTodos: boolean;
    pushSubscriptions: boolean;
    userConsents: boolean;
    aiRequestLogs: boolean;
    marketingSpend: boolean;
  };
}

const FALLBACK_HEALTH: AppHealthSnapshot = {
  ok: true,
  app: "fazumi-web",
  env: {
    supabase: false,
    openai: false,
    lemonsqueezy: false,
  },
  envConfigured: false,
  timestamp: new Date(0).toISOString(),
  supabase: false,
  schema: {
    profiles: false,
    summaries: false,
    subscriptions: false,
    userTodos: false,
    pushSubscriptions: false,
    userConsents: false,
    aiRequestLogs: false,
    marketingSpend: false,
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
          schema: {
            ...FALLBACK_HEALTH.schema,
            ...(payload.schema ?? {}),
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
