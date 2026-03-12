import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SummaryResult } from "@/lib/ai/summarize";
import { reserveUsageQuota } from "@/lib/server/summaries";
import {
  ensureTestAccounts,
  generateRecoveryLink,
  getDailyUsageCount,
  getSummaryDeletedAt,
  getDevEnv,
  getProfileState,
  loginWithEmail,
  openSummarizePage,
  resetTestUser,
  setAuthPassword,
} from "./support";

test.describe.configure({ mode: "serial" });

const SUMMARY_FIXTURE: SummaryResult = {
  tldr: "Math test Monday, field trip forms due Wednesday, and science slides upload Thursday night.",
  important_dates: [
    {
      label: "Monday math test covering chapters 4 to 6",
      date: "2025-02-17",
      time: null,
      location: null,
      urgent: false,
    },
    {
      label: "Wednesday field-trip form and $15 payment due",
      date: "2025-02-19",
      time: null,
      location: null,
      urgent: false,
    },
  ],
  action_items: [
    "Review math chapters 4 to 6 for Monday's test.",
    "Send the signed field-trip form with the $15 payment by Wednesday.",
    "Upload the science presentation slides by Thursday at 20:00.",
  ],
  urgent_action_items: [],
  people_classes: ["Ms. Sarah", "Parent Committee", "Science Dept"],
  contacts: [],
  links: ["Science presentation upload instructions"],
  questions: ["Should students bring any extra science-fair materials?"],
  chat_type: "routine_update",
  chat_context: {
    message_count_estimate: 4,
    date_range: "February 15, 2025",
    source_platform: "whatsapp",
    group_title: "Grade 4 Parents",
    school_name: null,
    child_name: null,
    class_name: "Grade 4",
  },
  lang_detected: "en",
  char_count: 705,
};

let cachedEnv: Record<string, string> | null = null;

function loadLocalEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env: Record<string, string> = {};

  for (const fileName of [".env", ".env.local"]) {
    const filePath = path.join(process.cwd(), fileName);
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

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!env[key]) {
        env[key] = value;
      }
    }
  }

  cachedEnv = env;
  return env;
}

function readEnv(name: string) {
  return process.env[name] ?? loadLocalEnv()[name] ?? "";
}

function ensureSupabaseEnv() {
  const names = [
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const;

  for (const name of names) {
    const value = readEnv(name);
    if (value && !process.env[name]) {
      process.env[name] = value;
    }
  }
}

function getAdminClient(): SupabaseClient {
  ensureSupabaseEnv();

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

function buildSummarizeSuccess(savedId: string) {
  return {
    summary: SUMMARY_FIXTURE,
    savedId,
  };
}

async function mockSummarizeResponses(
  page: Page,
  responses: Array<{ status: number; body: unknown }>
) {
  let responseIndex = 0;

  await page.route("**/api/summarize", async (route) => {
    const nextResponse = responses[Math.min(responseIndex, responses.length - 1)];
    responseIndex += 1;

    await route.fulfill({
      status: nextResponse.status,
      contentType: "application/json",
      body: JSON.stringify(nextResponse.body),
    });
  });
}

async function seedLegacySummary(userId: string, savedId = randomUUID()) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("summaries")
    .insert({
      id: savedId,
      user_id: userId,
      title: "Math test Monday and field-trip form due Wednesday",
      tldr: SUMMARY_FIXTURE.tldr,
      important_dates: SUMMARY_FIXTURE.important_dates.map((item) => item.label),
      action_items: SUMMARY_FIXTURE.action_items,
      people_classes: SUMMARY_FIXTURE.people_classes,
      links: SUMMARY_FIXTURE.links,
      questions: SUMMARY_FIXTURE.questions,
      char_count: SUMMARY_FIXTURE.char_count,
      lang_detected: SUMMARY_FIXTURE.lang_detected,
      source_kind: "text",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data?.id) {
    throw new Error(
      `Could not seed summary ${savedId}: ${error?.message ?? "Missing inserted row."}`
    );
  }

  return data.id;
}

test("auth + dashboard smoke: email login reaches dashboard", async ({ page, request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for auth smoke."
  );

  const accounts = await ensureTestAccounts(request);
  await resetTestUser(accounts.free.email, { plan: "free" });

  await loginWithEmail(page, accounts.free);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('a[href="/dashboard"]').first()).toBeVisible();
  await expect(page.locator('a[href="/summarize"]').first()).toBeVisible();
  await expect(page.locator('a[href="/history"]').first()).toBeVisible();
  await expect(page.locator('a[href="/billing"]').first()).toBeVisible();
});

test("desktop sidebar keeps lower nav items visible while content scrolls", async ({
  page,
  request,
}) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for sidebar smoke."
  );

  const accounts = await ensureTestAccounts(request);
  await page.setViewportSize({ width: 1280, height: 720 });
  await loginWithEmail(page, accounts.paid);
  await page.goto("/summarize");

  const sidebar = page.getByTestId("dashboard-sidebar");
  const settingsLink = sidebar.locator('a[href="/settings"]');
  const historyLink = sidebar.locator('a[href="/history"]');
  const main = page.getByTestId("dashboard-shell-main");

  await expect(settingsLink).toBeInViewport();

  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await main.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect(settingsLink).toBeInViewport();
  await expect(historyLink).toBeInViewport();
});

test("forgot-password smoke: login request + recovery reset works end to end", async ({
  page,
  request,
}) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for password recovery smoke."
  );

  const accounts = await ensureTestAccounts(request);
  await resetTestUser(accounts.free.email, { plan: "free" });

  await page.route("**/auth/v1/recover*", async (route) => {
    const payload = route.request().postDataJSON() as { email?: string } | null;
    expect(payload?.email).toBe(accounts.free.email);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  await page.goto("/login");
  await page.locator("#login-email").fill(accounts.free.email);
  await page.getByTestId("forgot-password-toggle").click();
  await page.getByTestId("forgot-password-submit").click();
  await expect(page.getByText(/If an account exists|إذا كان هذا البريد مرتبطًا بحساب/)).toBeVisible();

  await page.unroute("**/auth/v1/recover*");

  const newPassword = `Reset-${Date.now()}-Aa1!`;
  const actionLink = await generateRecoveryLink(accounts.free.email);

  try {
    await page.goto(actionLink);
    await page.waitForURL(/\/reset-password\?flow=recovery/, { timeout: 30_000 });
    await page.getByTestId("reset-password-new").fill(newPassword);
    await page.getByTestId("reset-password-confirm").fill(newPassword);
    await page.getByTestId("reset-password-submit").click();
    await page.waitForURL(/\/login\?reset=success/, { timeout: 30_000 });
    await expect(page.getByText(/Password updated|تم تحديث كلمة المرور/)).toBeVisible();

    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await loginWithEmail(page, {
      ...accounts.free,
      password: newPassword,
    });
    await expect(page).toHaveURL(/\/dashboard$/);
  } finally {
    await setAuthPassword(accounts.free.email, accounts.free.password);
  }
});

test("summarize smoke: paste-first UI renders and paid history export still works", async ({
  page,
  request,
}) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for summarize smoke."
  );

  const accounts = await ensureTestAccounts(request);
  await resetTestUser(accounts.paid.email, { plan: "monthly" });
  const profile = await getProfileState(accounts.paid.email);
  const savedId = await seedLegacySummary(profile.id);
  await mockSummarizeResponses(page, [{ status: 200, body: buildSummarizeSuccess(savedId) }]);

  await loginWithEmail(page, accounts.paid);
  await openSummarizePage(page);
  await page.getByTestId("summary-use-sample").click();
  await page.getByTestId("summary-submit").click();
  await expect(page.getByTestId("summary-saved-banner")).toBeVisible();

  await page.goto("/history");
  const historyRows = page.getByTestId("history-row");
  await expect(historyRows).toHaveCount(1);

  const historyHref = await page.getByTestId("history-row-link").first().getAttribute("href");
  expect(historyHref).toBeTruthy();
  await page.goto(historyHref ?? "/history");
  await expect(page.getByText("TL;DR")).toBeVisible();

  await page.getByTestId("summary-action-export").click();
  await expect(page.getByTestId("summary-share-panel")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("summary-download-export").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.txt$/i);
});

test("limits + gated export: free trial blocks on the 4th summary and keeps export gated", async ({
  page,
  request,
}) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for limits smoke."
  );

  const accounts = await ensureTestAccounts(request);
  await resetTestUser(accounts.free.email, { plan: "free" });

  const profile = await getProfileState(accounts.free.email);
  const isTrialActive = Boolean(
    profile.trial_expires_at && new Date(profile.trial_expires_at) > new Date()
  );

  await loginWithEmail(page, accounts.free);

  if (isTrialActive) {
    await mockSummarizeResponses(page, [
      { status: 200, body: buildSummarizeSuccess(randomUUID()) },
      { status: 200, body: buildSummarizeSuccess(randomUUID()) },
      { status: 200, body: buildSummarizeSuccess(randomUUID()) },
      { status: 402, body: { error: "limit_reached", code: "DAILY_CAP" } },
    ]);

    await openSummarizePage(page);
    await page.getByTestId("summary-use-sample").click();
    await page.getByTestId("summary-submit").click();
    await expect(page.getByTestId("summary-saved-banner")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("summary-action-export").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /Maybe later|لاحقًا/ }).click();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await openSummarizePage(page);
      await page.getByTestId("summary-use-sample").click();
      await page.getByTestId("summary-submit").click();
      await expect(page.getByTestId("summary-saved-banner")).toBeVisible({ timeout: 60_000 });
    }

    await openSummarizePage(page);
    await page.getByTestId("summary-use-sample").click();
    await page.getByTestId("summary-submit").click();
    const limitBanner = page.getByTestId("summary-limit-banner");
    await expect(limitBanner).toBeVisible();
    await expect(limitBanner.locator('a[href="/pricing"]')).toHaveCount(0);
    await expect(limitBanner.locator('a[href="/history"]')).toHaveCount(1);
    return;
  }

  await mockSummarizeResponses(page, [
    { status: 402, body: { error: "limit_reached", code: "LIFETIME_CAP" } },
  ]);
  await openSummarizePage(page);
  await page.getByTestId("summary-use-sample").click();
  await page.getByTestId("summary-submit").click();
  const limitBanner = page.getByTestId("summary-limit-banner");
  await expect(limitBanner).toBeVisible();
  await expect(limitBanner.locator('a[href="/pricing"]')).toHaveCount(1);
});

test("limits are atomic: free trial quota reservations stop at 3 per day", async ({
  request,
}) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for atomic limit smoke."
  );

  const accounts = await ensureTestAccounts(request);
  await resetTestUser(accounts.free.email, { plan: "free" });
  const profile = await getProfileState(accounts.free.email);
  const dateKey = new Date().toISOString().slice(0, 10);

  ensureSupabaseEnv();

  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      reserveUsageQuota({
        userId: profile.id,
        tierKey: "trial",
        dateKey,
      })
    )
  );

  const successCount = results.filter((result) => result.ok).length;
  const dailyCapCount = results.filter(
    (result) => !result.ok && result.code === "DAILY_CAP"
  ).length;

  expect(successCount).toBe(3);
  expect(dailyCapCount).toBe(2);
  await expect.poll(() => getDailyUsageCount(accounts.free.email, dateKey)).toBe(3);
});

test("billing smoke: billing view plans shows the correct cards for free, paid, and founder accounts", async ({
  page,
  request,
}) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for billing smoke."
  );

  const accounts = await ensureTestAccounts(request);
  const openBillingPlans = async () => {
    await expect(page.getByTestId("billing-view-plans")).toBeVisible();
    await page.getByTestId("billing-view-plans").click();
  };

  await resetTestUser(accounts.free.email, { plan: "free" });
  await loginWithEmail(page, accounts.free);
  await page.goto("/billing");
  await expect(page.getByTestId("billing-current-plan")).toContainText(/Free|مجاني/);
  await openBillingPlans();
  await expect(page.getByTestId("pricing-plan-free")).toHaveCount(1);
  await expect(page.getByTestId("pricing-plan-monthly")).toHaveCount(1);
  await expect(page.getByTestId("pricing-plan-founder")).toHaveCount(1);
  await expect(page.locator('[data-testid^="pricing-plan-"]')).toHaveCount(3);
  await expect(page.getByTestId("pricing-plan-free")).toHaveAttribute(
    "data-current-plan",
    "true"
  );
  await expect(page.getByTestId("sidebar-upsell-card")).toHaveCount(0);

  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await resetTestUser(accounts.paid.email, { plan: "monthly" });
  await loginWithEmail(page, accounts.paid);
  await page.goto("/billing");
  await expect(page.getByTestId("billing-current-plan")).toContainText(
    /Pro Monthly|برو الشهري/
  );
  await openBillingPlans();
  await expect(page.getByTestId("pricing-plan-free")).toHaveCount(0);
  await expect(page.getByTestId("pricing-plan-monthly")).toHaveCount(1);
  await expect(page.getByTestId("pricing-plan-founder")).toHaveCount(1);
  await expect(page.locator('[data-testid^="pricing-plan-"]')).toHaveCount(2);
  await expect(page.getByTestId("pricing-plan-monthly")).toHaveAttribute(
    "data-current-plan",
    "true"
  );
  await expect(page.getByTestId("sidebar-upsell-card")).toHaveCount(0);

  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await resetTestUser(accounts.founder.email, { plan: "founder" });
  await loginWithEmail(page, accounts.founder);
  await page.goto("/billing");
  await expect(page.getByTestId("billing-current-plan")).toContainText(
    /Founder|باقة المؤسسين/
  );
  await expect(page.locator("body")).toContainText(
    /Your founder plan|خطة المؤسس الخاصة بك/
  );
  await expect(page.getByTestId("billing-view-plans")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /founding supporters story|قصة الداعمين المؤسسين/i })).toHaveCount(
    1
  );
  await expect(page.getByTestId("sidebar-upsell-card")).toHaveCount(0);
});

test("history delete smoke: deleting a summary removes it immediately and after refresh", async ({
  page,
  request,
}) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for history deletion smoke."
  );

  const accounts = await ensureTestAccounts(request);
  await resetTestUser(accounts.paid.email, { plan: "monthly" });
  const profile = await getProfileState(accounts.paid.email);
  const summaryId = await seedLegacySummary(profile.id);

  await loginWithEmail(page, accounts.paid);

  await page.goto("/history");
  const row = page.getByTestId("history-row").first();
  await row.hover();
  await row.getByRole("button", { name: /Delete|حذف/ }).click();
  await row.getByRole("button", { name: /Yes|نعم/ }).click();
  await expect(page.getByTestId("history-row")).toHaveCount(0);

  await expect
    .poll(async () => getSummaryDeletedAt(summaryId), { timeout: 15_000 })
    .not.toBeNull();

  await page.reload();
  await expect(page.getByTestId("history-row")).toHaveCount(0);
});
