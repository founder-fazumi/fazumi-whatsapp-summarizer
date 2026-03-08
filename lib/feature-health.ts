export interface AppHealthSnapshot {
  ok: boolean;
  env: {
    supabase: boolean;
    openai: boolean;
    lemonsqueezy: boolean;
  };
  envConfigured: boolean;
}

const FALLBACK_HEALTH: AppHealthSnapshot = {
  ok: false,
  env: {
    supabase: false,
    openai: false,
    lemonsqueezy: false,
  },
  envConfigured: false,
};

let cachedHealthSnapshot: AppHealthSnapshot | null = null;
let healthRequest: Promise<AppHealthSnapshot> | null = null;

export function getTodoStorageMode(health: AppHealthSnapshot | null | undefined) {
  return health?.env.supabase === false ? "local" as const : "remote" as const;
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
        const payload = (await response.json()) as Partial<AppHealthSnapshot>;
        const snapshot: AppHealthSnapshot = {
          ...FALLBACK_HEALTH,
          ...payload,
          env: {
            ...FALLBACK_HEALTH.env,
            ...(payload.env ?? {}),
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
