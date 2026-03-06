import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPlaywrightBaseUrl } from "@/lib/testing/playwright";

const ROOT_DIR = process.cwd();
const ADMIN_EMAIL = "admin@fazumi.test";
const FREE_EMAIL = "free@fazumi.test";
const PAID_EMAIL = "paid@fazumi.test";
const FOUNDER_EMAIL = "founder@fazumi.test";
const FIXTURES_DIR = path.join(ROOT_DIR, "scripts", "webhooks", "fixtures");
const RECURRING_FIXTURE_EMAILS: Record<string, string> = {
  subscription_payment_success: PAID_EMAIL,
  subscription_updated_active: PAID_EMAIL,
};

type DevEnvResponse = {
  ok: boolean;
  env: {
    supabaseUrl: boolean;
    supabaseAnon: boolean;
    serviceRole: boolean;
    openai: boolean;
  };
  hint?: string | null;
};

type AccountResponse = {
  ok: boolean;
  accounts: Array<{
    email: string;
    password: string;
    plan: string;
    status: "created" | "updated";
  }>;
};

type TestAccount = {
  email: string;
  password: string;
  plan: string;
};

type ProfileRow = {
  id: string;
  plan: string | null;
  trial_expires_at: string | null;
  lifetime_free_used: number | null;
};

type SubscriptionRow = {
  user_id: string;
  ls_subscription_id: string | null;
  status: string;
  current_period_end: string | null;
  ls_customer_portal_url: string | null;
  ls_update_payment_method_url: string | null;
};

const envCache = loadLocalEnv();

function loadLocalEnv() {
  const env: Record<string, string> = {};

  for (const fileName of [".env", ".env.local"]) {
    const filePath = path.join(ROOT_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex < 1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();
      value = stripInlineComment(value);
      value = stripWrappingQuotes(value);

      if (!env[key]) {
        env[key] = value;
      }
    }
  }

  return env;
}

function stripInlineComment(value: string) {
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const prev = index === 0 ? "" : value[index - 1];

    if ((char === '"' || char === "'") && prev !== "\\") {
      quote = quote === char ? null : quote ?? char;
      continue;
    }

    if (char === "#" && !quote && /\s/.test(prev)) {
      return value.slice(0, index).trimEnd();
    }
  }

  return value;
}

function stripWrappingQuotes(value: string) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];

    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }

  return value;
}

function readEnv(name: string) {
  return process.env[name] ?? envCache[name] ?? "";
}

function hasSupabaseAuthCookie(
  cookies: Array<{
    name: string;
  }>
) {
  return cookies.some(({ name }) =>
    name === "supabase-auth-token" ||
    name.startsWith("supabase-auth-token.") ||
    (name.startsWith("sb-") && name.includes("-auth-token"))
  );
}

async function waitForReactHydration(page: Page, selector: string) {
  await page.waitForFunction((inputSelector) => {
    const node = document.querySelector(inputSelector) as Record<string, unknown> | null;
    if (!node) {
      return false;
    }

    return Object.keys(node).some((key) =>
      key.startsWith("__reactFiber") || key.startsWith("__reactProps")
    );
  }, selector);
}

function getAdminClient(): SupabaseClient {
  const supabaseUrl = readEnv("SUPABASE_URL") || readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin env vars for smoke tests.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getDevEnv(request: APIRequestContext) {
  const response = await request.get("/api/dev/env-check");
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as DevEnvResponse;
}

export async function ensureTestAccounts(request: APIRequestContext) {
  const response = await request.post("/api/dev/create-test-accounts");
  expect(response.ok()).toBeTruthy();

  const payload = (await response.json()) as AccountResponse;

  function getAccount(email: string) {
    const account = payload.accounts.find((item) => item.email === email);
    expect(account, `Missing seeded account for ${email}`).toBeTruthy();
    return account as TestAccount;
  }

  return {
    admin: getAccount(ADMIN_EMAIL),
    free: getAccount(FREE_EMAIL),
    paid: getAccount(PAID_EMAIL),
    founder: getAccount(FOUNDER_EMAIL),
  };
}

export async function getAuthCookieHeader(account: TestAccount) {
  const supabaseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase anon env vars for auth cookie creation.");
  }

  const cookies = new Map<string, string>();
  const client = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return Array.from(cookies.entries()).map(([name, value]) => ({ name, value }));
      },
      setAll(items) {
        for (const item of items) {
          if (item.value) {
            cookies.set(item.name, item.value);
          } else {
            cookies.delete(item.name);
          }
        }
      },
    },
  });

  const { error } = await client.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });

  if (error) {
    throw new Error(`Could not create auth cookie for ${account.email}: ${error.message}`);
  }

  if (cookies.size === 0) {
    throw new Error(`Supabase did not return auth cookies for ${account.email}.`);
  }

  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

export async function getAuthCookies(account: TestAccount) {
  const cookieHeader = await getAuthCookieHeader(account);
  const baseURL = getPlaywrightBaseUrl();

  return cookieHeader
    .split(/;\s*/)
    .filter(Boolean)
    .map((item) => {
      const separatorIndex = item.indexOf("=");
      const name = item.slice(0, separatorIndex);
      const value = item.slice(separatorIndex + 1);

      return {
        name,
        value,
        url: baseURL,
      };
    });
}

export async function loginWithEmail(page: Page, account: TestAccount) {
  await page.goto("/login");
  await waitForReactHydration(page, "#login-email");
  await page.locator("#login-email").fill(account.email);
  await page.locator("#login-pass").fill(account.password);
  await page
    .locator("form")
    .filter({ has: page.locator("#login-email") })
    .locator('button[type="submit"]')
    .click();

  await expect.poll(async () => {
    if (/\/dashboard(?:$|[/?#])/.test(page.url())) {
      return "dashboard";
    }

    const cookies = await page.context().cookies();
    return hasSupabaseAuthCookie(cookies) ? "session" : "pending";
  }, {
    timeout: 30_000,
    message: `Expected ${account.email} to establish a Supabase session.`,
  }).not.toBe("pending");

  if (!/\/dashboard(?:$|[/?#])/.test(page.url())) {
    try {
      await page.goto("/dashboard");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("ERR_ABORTED")) {
        throw error;
      }
    }

    await expect
      .poll(() => /\/dashboard(?:$|[/?#])/.test(page.url()), {
        timeout: 15_000,
        message: `Expected ${account.email} to land on /dashboard after login.`,
      })
      .toBeTruthy();
  }
}

export async function resetTestUser(
  email: string,
  options: {
    plan: "free" | "monthly" | "founder";
    clearSubscriptions?: boolean;
    lifetimeFreeUsed?: number;
    trialExpiresAt?: string | null;
  }
) {
  const admin = getAdminClient();
  const user = await findUserByEmail(admin, email);
  const nowIso = new Date().toISOString();

  const { error: summariesError } = await admin.from("summaries").delete().eq("user_id", user.id);
  const { error: usageError } = await admin.from("usage_daily").delete().eq("user_id", user.id);

  if (summariesError || usageError) {
    throw new Error(
      summariesError?.message ??
      usageError?.message ??
      "Could not clear test user state."
    );
  }

  if (options.clearSubscriptions) {
    const { error: subscriptionsError } = await admin.from("subscriptions").delete().eq("user_id", user.id);
    if (subscriptionsError) {
      throw new Error(`Could not clear subscriptions for ${email}: ${subscriptionsError.message}`);
    }
  }

  const trialExpiresAt =
    options.trialExpiresAt !== undefined
      ? options.trialExpiresAt
      : options.plan === "free"
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

  const { error } = await admin
    .from("profiles")
    .update({
      plan: options.plan,
      trial_expires_at: trialExpiresAt,
      lifetime_free_used: options.lifetimeFreeUsed ?? 0,
      updated_at: nowIso,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(`Could not reset test profile for ${email}: ${error.message}`);
  }

  return user.id;
}

export async function getProfileState(email: string) {
  const admin = getAdminClient();
  const user = await findUserByEmail(admin, email);
  const { data, error } = await admin
    .from("profiles")
    .select("id, plan, trial_expires_at, lifetime_free_used")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (error || !data) {
    throw new Error(`Could not load profile for ${email}: ${error?.message ?? "Missing row."}`);
  }

  return data;
}

export async function getVisibleSummaryIds(email: string) {
  const admin = getAdminClient();
  const user = await findUserByEmail(admin, email);
  const { data, error } = await admin
    .from("summaries")
    .select("id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not list summaries for ${email}: ${error.message}`);
  }

  return (data ?? []).map((row) => row.id as string);
}

export async function getDailyUsageCount(email: string, dateKey = new Date().toISOString().slice(0, 10)) {
  const admin = getAdminClient();
  const user = await findUserByEmail(admin, email);
  const { data, error } = await admin
    .from("usage_daily")
    .select("summaries_used")
    .eq("user_id", user.id)
    .eq("date", dateKey)
    .maybeSingle<{ summaries_used: number | null }>();

  if (error) {
    throw new Error(`Could not read daily usage for ${email}: ${error.message}`);
  }

  return data?.summaries_used ?? 0;
}

export async function getSummaryDeletedAt(summaryId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("summaries")
    .select("deleted_at")
    .eq("id", summaryId)
    .maybeSingle<{ deleted_at: string | null }>();

  if (error) {
    throw new Error(`Could not verify deleted summary ${summaryId}: ${error.message}`);
  }

  return data?.deleted_at ?? null;
}

export async function getSubscription(subscriptionId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select(
      "user_id, ls_subscription_id, status, current_period_end, ls_customer_portal_url, ls_update_payment_method_url"
    )
    .eq("ls_subscription_id", subscriptionId)
    .maybeSingle<SubscriptionRow>();

  if (error) {
    throw new Error(`Could not load subscription ${subscriptionId}: ${error.message}`);
  }

  return data;
}

export async function getLatestSupportRequest(email: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("support_requests")
    .select("id, email, subject, message, status, priority, locale, created_at")
    .eq("email", email.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      email: string | null;
      subject: string;
      message: string;
      status: string;
      priority: string;
      locale: string;
      created_at: string;
    }>();

  if (error) {
    const { data: fallbackData, error: fallbackError } = await admin
      .from("user_feedback")
      .select("id, message, meta_json, created_at")
      .filter("meta_json->>email", "eq", email.toLowerCase())
      .filter("meta_json->>type", "eq", "support")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        message: string;
        meta_json: {
          email?: string;
          subject?: string;
          status?: string;
          priority?: string;
          locale?: string;
        } | null;
        created_at: string;
      }>();

    if (fallbackError) {
      throw new Error(`Could not read support request for ${email}: ${error.message}`);
    }

    if (!fallbackData) {
      return null;
    }

    return {
      id: fallbackData.id,
      email: fallbackData.meta_json?.email ?? email.toLowerCase(),
      subject: fallbackData.meta_json?.subject ?? fallbackData.message.slice(0, 96),
      message: fallbackData.message,
      status: fallbackData.meta_json?.status ?? "pending",
      priority: fallbackData.meta_json?.priority ?? "medium",
      locale: fallbackData.meta_json?.locale ?? "en",
      created_at: fallbackData.created_at,
    };
  }

  return data;
}

export async function getLatestFeedback(email: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("user_feedback")
    .select("id, email, subject, message, status, priority, locale, created_at")
    .eq("email", email.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      email: string | null;
      subject: string;
      message: string;
      status: string;
      priority: string;
      locale: string;
      created_at: string;
    }>();

  if (error) {
    throw new Error(`Could not read feedback for ${email}: ${error.message}`);
  }

  return data;
}

export async function updateSubscriptionStatus(subscriptionId: string, status: string) {
  const admin = getAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("ls_subscription_id", subscriptionId);

  if (error) {
    throw new Error(`Could not set subscription ${subscriptionId} to ${status}: ${error.message}`);
  }
}

export function replayWebhook(fixtureName: string) {
  const pnpmExecutable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(pnpmExecutable, ["webhook:replay", fixtureName], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    env: { ...process.env },
  });

  if (result.status !== 0) {
    throw new Error(
      `Webhook replay failed for ${fixtureName}.\n${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim()
    );
  }
}

export function getMissingWebhookReplayEnv() {
  const missing: string[] = [];

  if (!readEnv("SUPABASE_URL") && !readEnv("NEXT_PUBLIC_SUPABASE_URL")) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!readEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!readEnv("LEMONSQUEEZY_WEBHOOK_SECRET") && !readEnv("LEMON_SIGNING_SECRET")) {
    missing.push("LEMONSQUEEZY_WEBHOOK_SECRET");
  }

  return missing;
}

export async function hasSubscriptionPortalColumns() {
  const admin = getAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .select("ls_customer_portal_url, ls_update_payment_method_url")
    .limit(1);

  if (!error) {
    return true;
  }

  if (
    error.message.includes("ls_customer_portal_url") ||
    error.message.includes("ls_update_payment_method_url")
  ) {
    return false;
  }

  throw new Error(`Could not verify subscription portal URL columns: ${error.message}`);
}

export async function postWebhookFixture(fixtureName: "subscription_payment_success" | "subscription_updated_active") {
  const admin = getAdminClient();
  const payload = JSON.parse(
    fs.readFileSync(path.join(FIXTURES_DIR, `${fixtureName}.json`), "utf8")
  ) as {
    meta?: { custom_data?: { user_id?: string } };
    data?: { id?: string };
  };

  const email = RECURRING_FIXTURE_EMAILS[fixtureName];
  const user = await findUserByEmail(admin, email);
  const subscriptionId = String(payload.data?.id ?? "");

  if (!subscriptionId) {
    throw new Error(`Fixture ${fixtureName} is missing data.id.`);
  }

  if (payload.meta?.custom_data?.user_id) {
    payload.meta.custom_data.user_id = user.id;
  }

  const { error: seedError } = await admin
    .from("subscriptions")
    .upsert(
      {
        user_id: user.id,
        ls_subscription_id: subscriptionId,
        ls_order_id: null,
        plan_type: "monthly",
        status: "past_due",
        current_period_end: "2026-03-15T00:00:00.000Z",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ls_subscription_id" }
    );

  if (seedError) {
    throw new Error(`Could not seed recurring subscription ${subscriptionId}: ${seedError.message}`);
  }

  const secret = readEnv("LEMONSQUEEZY_WEBHOOK_SECRET") || readEnv("LEMON_SIGNING_SECRET");
  if (!secret) {
    throw new Error("Missing webhook signing secret for payment smoke.");
  }

  const baseURL = getPlaywrightBaseUrl();
  const rawBody = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(rawBody).digest("hex");
  const response = await fetch(`${baseURL}/api/webhooks/lemonsqueezy`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": signature,
    },
    body: rawBody,
  });

  if (!response.ok) {
    throw new Error(`Webhook fixture ${fixtureName} failed with ${response.status}: ${await response.text()}`);
  }
}

export async function summarizeWithSample(page: Page) {
  await page.goto("/summarize");
  await page.getByTestId("summary-use-sample").click();
  await page.getByTestId("summary-submit").click();
  await expect(page.getByTestId("summary-saved-banner")).toBeVisible({ timeout: 90_000 });
}

async function findUserByEmail(admin: SupabaseClient, email: string) {
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });

    if (error) {
      throw error;
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
    if (match) {
      return match;
    }

    if (data.users.length < 100) {
      throw new Error(`Could not find auth user for ${email}`);
    }

    page += 1;
  }
}
