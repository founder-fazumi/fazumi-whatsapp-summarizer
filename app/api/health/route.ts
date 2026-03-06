import { NextResponse } from "next/server";
import { getUtcDateKey } from "@/lib/limits";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCheckoutConfigSummary } from "@/lib/lemonsqueezy-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getEnvStatus() {
  const checkoutConfig = getCheckoutConfigSummary();
  const allVariantsReady =
    checkoutConfig.ready.length === 3 &&
    checkoutConfig.missing.length === 0 &&
    checkoutConfig.invalid.length === 0;

  return {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    lemonsqueezy: Boolean(
      (process.env.LEMONSQUEEZY_WEBHOOK_SECRET || process.env.LEMON_SIGNING_SECRET) &&
      allVariantsReady
    ),
  };
}

async function checkTableHealth(table: string, column = "id") {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from(table).select(column, {
      head: true,
      count: "exact",
    });

    return !error;
  } catch {
    return false;
  }
}

async function checkRestTableHealth(table: string) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || !anonKey) {
    return false;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=id&limit=1`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    return response.status !== 404;
  } catch {
    return false;
  }
}

async function checkAtomicRpcHealth(
  fn: "increment_usage_daily_atomic" | "increment_lifetime_free_atomic"
) {
  try {
    const supabase = createAdminClient();
    const fakeUserId = "00000000-0000-0000-0000-000000000000";
    const result =
      fn === "increment_usage_daily_atomic"
        ? await supabase.rpc(fn, {
          p_user_id: fakeUserId,
          p_date: getUtcDateKey(),
          p_increment: 0,
        })
        : await supabase.rpc(fn, {
          p_user_id: fakeUserId,
          p_increment: 0,
        });

    if (!result.error) {
      return true;
    }

    return result.error.code !== "PGRST202";
  } catch {
    return false;
  }
}

export async function GET() {
  const env = getEnvStatus();
  const timestamp = new Date().toISOString();
  const envConfigured = env.supabase && env.serviceRole && env.openai;
  const [
    profilesReady,
    summariesReady,
    subscriptionsReady,
    usageDailyReady,
    userTodosReady,
    pushSubscriptionsReady,
    userConsentsReady,
    aiRequestLogsReady,
    marketingSpendReady,
    userTodosRestReady,
    usageDailyAtomicReady,
    lifetimeFreeAtomicReady,
  ] = await Promise.all([
    checkTableHealth("profiles"),
    checkTableHealth("summaries"),
    checkTableHealth("subscriptions"),
    checkTableHealth("usage_daily", "user_id"),
    checkTableHealth("user_todos"),
    checkTableHealth("push_subscriptions"),
    checkTableHealth("user_consents"),
    checkTableHealth("ai_request_logs"),
    checkTableHealth("marketing_spend"),
    checkRestTableHealth("user_todos"),
    checkAtomicRpcHealth("increment_usage_daily_atomic"),
    checkAtomicRpcHealth("increment_lifetime_free_atomic"),
  ]);

  const critical = {
    profiles: profilesReady,
    summaries: summariesReady,
    subscriptions: subscriptionsReady,
    usageDaily: usageDailyReady,
    incrementUsageDailyAtomic: usageDailyAtomicReady,
    incrementLifetimeFreeAtomic: lifetimeFreeAtomicReady,
  };
  const criticalReady = Object.values(critical).every(Boolean);
  const ok = envConfigured && criticalReady;

  return NextResponse.json(
    {
      ok,
      app: "fazumi-web",
      env,
      envConfigured,
      timestamp,
      supabase: criticalReady,
      critical,
      schema: {
        profiles: profilesReady,
        summaries: summariesReady,
        subscriptions: subscriptionsReady,
        usageDaily: usageDailyReady,
        userTodos: userTodosReady && userTodosRestReady,
        pushSubscriptions: pushSubscriptionsReady,
        userConsents: userConsentsReady,
        aiRequestLogs: aiRequestLogsReady,
        marketingSpend: marketingSpendReady,
      },
      rpcs: {
        incrementUsageDailyAtomic: usageDailyAtomicReady,
        incrementLifetimeFreeAtomic: lifetimeFreeAtomicReady,
      },
    },
    { status: ok ? 200 : 503 }
  );
}
