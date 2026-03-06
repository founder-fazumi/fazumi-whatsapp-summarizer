import { expect, request as playwrightRequest, test } from "@playwright/test";
import { getPlaywrightBaseUrl } from "@/lib/testing/playwright";
import {
  ensureTestAccounts,
  getAuthCookieHeader,
  getAuthCookies,
  getDevEnv,
  getLatestSupportRequest,
  loginWithEmail,
} from "./support";

test.describe.configure({ mode: "serial" });

test("admin overview renders for an admin user", async ({ page, request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for admin coverage."
  );

  const accounts = await ensureTestAccounts(request);
  await page.context().addCookies(await getAuthCookies(accounts.admin));
  await page.goto("/admin_dashboard");

  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("OpenAI spend")).toBeVisible();
  await expect(page.getByText("Needs attention")).toBeVisible();
});

test("admin inbox tabs render for an admin user", async ({ page, request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for admin inbox coverage."
  );

  const accounts = await ensureTestAccounts(request);
  await page.context().addCookies(await getAuthCookies(accounts.admin));
  await page.goto("/admin_dashboard/inbox");

  await expect(page.getByRole("heading", { name: "Admin inbox" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Feedback/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Support/i })).toBeVisible();
  await expect(page.locator("#admin-inbox-search")).toBeVisible();
});

test("support request from contact page appears in the admin inbox", async ({ page, request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for contact inbox coverage."
  );

  const accounts = await ensureTestAccounts(request);
  const unique = Date.now();
  const email = `support-${unique}@fazumi.test`;
  const subject = `Support inbox test ${unique}`;
  const message = "Billing email did not arrive after checkout and I need help tracing it.";

  await page.goto("/contact");
  await page.getByTestId("contact-mode-support").click();
  await page.locator("#contact-email").fill(email);
  await page.getByTestId("contact-subject").fill(subject);
  await page.locator("#contact-message").fill(message);
  await page.getByTestId("contact-submit").click();
  await expect(page.getByTestId("contact-success")).toBeVisible();

  await expect.poll(async () => (await getLatestSupportRequest(email))?.subject ?? null).toBe(subject);

  await page.context().addCookies(await getAuthCookies(accounts.admin));
  await page.goto("/admin_dashboard/inbox?tab=support");
  await page.locator("#admin-inbox-search").fill(subject);
  await expect(page.getByText(subject)).toBeVisible();
});

test("non-admin users are blocked from admin routes and APIs", async ({ page, request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for admin auth coverage."
  );

  const accounts = await ensureTestAccounts(request);
  await loginWithEmail(page, accounts.free);
  await page.goto("/admin_dashboard");

  await expect(page).toHaveURL(/\/dashboard$/);

  const cookieHeader = await getAuthCookieHeader(accounts.free);
  const api = await playwrightRequest.newContext({
    baseURL: getPlaywrightBaseUrl(),
    extraHTTPHeaders: {
      cookie: cookieHeader,
    },
  });

  try {
    const response = await api.get("/api/admin/metrics");
    expect(response.status()).toBe(403);
  } finally {
    await api.dispose();
  }
});
