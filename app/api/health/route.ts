import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getEnvStatus() {
  return {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    openai: Boolean(process.env.OPENAI_API_KEY),
    lemonsqueezy: Boolean(
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET || process.env.LEMON_SIGNING_SECRET
    ),
  };
}

async function checkTableHealth(table: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from(table).select("id", {
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

export async function GET() {
  const env = getEnvStatus();
  const timestamp = new Date().toISOString();
  const envConfigured = env.supabase && env.openai;
  const [
    profilesReady,
    summariesReady,
    subscriptionsReady,
    userTodosReady,
    pushSubscriptionsReady,
    userConsentsReady,
    aiRequestLogsReady,
    marketingSpendReady,
    userTodosRestReady,
  ] = await Promise.all([
    checkTableHealth("profiles"),
    checkTableHealth("summaries"),
    checkTableHealth("subscriptions"),
    checkTableHealth("user_todos"),
    checkTableHealth("push_subscriptions"),
    checkTableHealth("user_consents"),
    checkTableHealth("ai_request_logs"),
    checkTableHealth("marketing_spend"),
    checkRestTableHealth("user_todos"),
  ]);

  return NextResponse.json({
    ok: true,
    app: "fazumi-web",
    env,
    envConfigured,
    timestamp,
    supabase: profilesReady,
    schema: {
      profiles: profilesReady,
      summaries: summariesReady,
      subscriptions: subscriptionsReady,
      userTodos: userTodosReady && userTodosRestReady,
      pushSubscriptions: pushSubscriptionsReady,
      userConsents: userConsentsReady,
      aiRequestLogs: aiRequestLogsReady,
      marketingSpend: marketingSpendReady,
    },
  });
}
