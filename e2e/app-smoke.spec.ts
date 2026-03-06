import { expect, request as playwrightRequest, test } from "@playwright/test";
import { getPlaywrightBaseUrl } from "@/lib/testing/playwright";
import {
  ensureTestAccounts,
  getAuthCookieHeader,
  getDailyUsageCount,
  getSummaryDeletedAt,
  getDevEnv,
  getProfileState,
  getVisibleSummaryIds,
  loginWithEmail,
  resetTestUser,
  summarizeWithSample,
} from "./support";

test.describe.configure({ mode: "serial" });

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

test("summarize smoke: paid summary saves to history and export downloads", async ({ page, request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for summarize smoke."
  );
  test.skip(!env.env.openai, env.hint ?? "OPENAI_API_KEY is required for summarize smoke.");

  const accounts = await ensureTestAccounts(request);
  await resetTestUser(accounts.paid.email, { plan: "monthly" });

  await loginWithEmail(page, accounts.paid);
  await summarizeWithSample(page);

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

test("limits + gated export: free trial blocks on the 4th summary and keeps export gated", async ({ page, request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for limits smoke."
  );
  const accounts = await ensureTestAccounts(request);
  await resetTestUser(accounts.free.email, { plan: "free" });

  const profile = await getProfileState(accounts.free.email);
  const isTrialActive = Boolean(profile.trial_expires_at && new Date(profile.trial_expires_at) > new Date());

  test.skip(isTrialActive && !env.env.openai, env.hint ?? "OPENAI_API_KEY is required for the trial daily-cap smoke.");

  await loginWithEmail(page, accounts.free);

  if (isTrialActive) {
    await summarizeWithSample(page);
    await page.getByTestId("summary-action-export").click();
    await expect(page.getByText("Subscribe to use this feature")).toBeVisible();
    await page.getByRole("button", { name: "Maybe later" }).click();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await page.goto("/summarize");
      await page.getByTestId("summary-use-sample").click();
      await page.getByTestId("summary-submit").click();
      await expect(page.getByTestId("summary-saved-banner")).toBeVisible({ timeout: 60_000 });
    }

    await page.goto("/summarize");
    await page.getByTestId("summary-use-sample").click();
    await page.getByTestId("summary-submit").click();
    const limitBanner = page.getByTestId("summary-limit-banner");
    await expect(limitBanner).toBeVisible();
    await expect(limitBanner).toContainText("You've reached today's limit");
    await expect(limitBanner.getByRole("link", { name: "Upgrade" })).toHaveCount(0);
    await expect(limitBanner.getByRole("link", { name: "View history" })).toBeVisible();
    return;
  }

  await page.goto("/summarize");
  await page.getByTestId("summary-use-sample").click();
  await page.getByTestId("summary-submit").click();
  const limitBanner = page.getByTestId("summary-limit-banner");
  await expect(limitBanner).toBeVisible();
  await expect(limitBanner).toContainText("You've used your 3 free summaries");
  await expect(limitBanner.getByRole("link", { name: "Upgrade" })).toBeVisible();
});

test("limits are atomic: free trial concurrent summarizes stop at 3 per day", async ({ request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for atomic limit smoke."
  );
  test.skip(!env.env.openai, env.hint ?? "OPENAI_API_KEY is required for atomic limit smoke.");

  const accounts = await ensureTestAccounts(request);
  await resetTestUser(accounts.free.email, { plan: "free" });
  const cookieHeader = await getAuthCookieHeader(accounts.free);
  const api = await playwrightRequest.newContext({
    baseURL: getPlaywrightBaseUrl(),
    extraHTTPHeaders: {
      cookie: cookieHeader,
    },
  });

  const text = [
    "[15/02/2025, 09:23] Ms. Sarah - Math Teacher: Good morning parents!",
    "[15/02/2025, 09:25] Parent Committee: Field trip forms due Wednesday with payment.",
    "[15/02/2025, 09:27] Science Dept: Science fair projects due Friday and slides are due Thursday night.",
  ].join(" ");

  try {
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        api.post("/api/summarize", {
          data: {
            text,
            lang_pref: "auto",
          },
        })
      )
    );

    const results = await Promise.all(
      responses.map(async (response) => ({
        status: response.status(),
        body: await response.json().catch(() => ({})),
      }))
    );

    const successCount = results.filter((result) => result.status === 200).length;
    const dailyCapCount = results.filter(
      (result) => result.status === 402 && result.body?.code === "DAILY_CAP"
    ).length;

    expect(successCount).toBe(3);
    expect(dailyCapCount).toBe(2);
    expect(results.every((result) => result.status === 200 || result.status === 402)).toBeTruthy();

    await expect.poll(() => getDailyUsageCount(accounts.free.email)).toBe(3);
    await expect.poll(async () => (await getVisibleSummaryIds(accounts.free.email)).length).toBe(3);
  } finally {
    await api.dispose();
  }
});

test("billing smoke: paid and founder plans show the correct plan and hide free upsells", async ({ page, request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for billing smoke."
  );

  const accounts = await ensureTestAccounts(request);

  await resetTestUser(accounts.paid.email, { plan: "monthly" });
  await loginWithEmail(page, accounts.paid);
  await page.goto("/billing");
  await expect(page.getByTestId("billing-current-plan")).toContainText("Pro Monthly");
  await expect(page.getByTestId("sidebar-upsell-card")).toHaveCount(0);

  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await resetTestUser(accounts.founder.email, { plan: "founder" });
  await loginWithEmail(page, accounts.founder);
  await page.goto("/billing");
  await expect(page.getByTestId("billing-current-plan")).toContainText("Founder LTD");
  await expect(page.getByTestId("sidebar-upsell-card")).toHaveCount(0);
});

test("history delete smoke: deleting a summary removes it immediately and after refresh", async ({ page, request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for history deletion smoke."
  );
  test.skip(!env.env.openai, env.hint ?? "OPENAI_API_KEY is required for history deletion smoke.");

  const accounts = await ensureTestAccounts(request);
  await resetTestUser(accounts.paid.email, { plan: "monthly" });

  await loginWithEmail(page, accounts.paid);
  await summarizeWithSample(page);

  const visibleBeforeDelete = await getVisibleSummaryIds(accounts.paid.email);
  expect(visibleBeforeDelete).toHaveLength(1);
  const [summaryId] = visibleBeforeDelete;

  await page.goto("/history");
  const row = page.getByTestId("history-row").first();
  await row.hover();
  await row.getByRole("button", { name: "Delete" }).click();
  await row.getByRole("button", { name: "Yes" }).click();
  await expect(page.getByTestId("history-row")).toHaveCount(0);

  await expect
    .poll(async () => getSummaryDeletedAt(summaryId), { timeout: 15_000 })
    .not.toBeNull();

  await page.reload();
  await expect(page.getByTestId("history-row")).toHaveCount(0);
});
