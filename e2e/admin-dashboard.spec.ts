import { expect, request as playwrightRequest, test, type Page } from "@playwright/test";
import { getPlaywrightBaseUrl } from "@/lib/testing/playwright";
import {
  ensureTestAccounts,
  getAuthCookieHeader,
  getDevEnv,
  getLatestSupportRequest,
  loginWithEmail,
} from "./support";

test.describe.configure({ mode: "serial" });

async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "Welcome Back, Sir." })).toBeVisible();
  await page.locator("#admin-username").fill("admin");
  await page.locator("#admin-password").fill("admin");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/admin_dashboard$/);
}

test("admin routes redirect to the dedicated admin login and admin/admin opens the dashboard", async ({
  page,
  request,
}) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.serviceRole,
    env.hint ?? "Supabase admin env is required for admin coverage."
  );

  await page.goto("/admin_dashboard");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin_dashboard$/);
  await expect(page.getByRole("heading", { name: "Welcome Back, Sir." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue with Apple" })).toHaveCount(0);
  await expect(page.getByText("Log in or create a free account to get started")).toHaveCount(0);
  await expect(page.getByText("By continuing you agree to our Terms and Privacy Policy.")).toHaveCount(0);

  await page.locator("#admin-username").fill("admin");
  await page.locator("#admin-password").fill("admin");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/admin_dashboard$/);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
});

test("wrong admin credentials do not create an admin session", async ({ page, request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.serviceRole,
    env.hint ?? "Supabase admin env is required for admin coverage."
  );

  await page.goto("/admin/login");
  await page.locator("#admin-username").fill("admin");
  await page.locator("#admin-password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.locator('p[role="alert"]')).toContainText("Invalid credentials.");
});

test("admin inbox tabs render after admin login", async ({ page, request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.serviceRole,
    env.hint ?? "Supabase admin env is required for admin inbox coverage."
  );

  await loginAsAdmin(page);
  await page.goto("/admin_dashboard/inbox");

  await expect(page.getByRole("heading", { name: "Admin inbox" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Feedback/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Support/i })).toBeVisible();
  await expect(page.locator("#admin-inbox-search")).toBeVisible();
});

test("support request from contact page appears in the admin inbox", async ({ page, request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.serviceRole,
    env.hint ?? "Supabase admin env is required for contact inbox coverage."
  );

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

  await loginAsAdmin(page);
  await page.goto("/admin_dashboard/inbox?tab=support");
  await page.locator("#admin-inbox-search").fill(subject);
  await expect(page.getByText(subject)).toBeVisible();
});

test("regular user auth does not grant access to admin routes or admin APIs", async ({
  page,
  request,
}) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for admin auth coverage."
  );

  const accounts = await ensureTestAccounts(request);
  await loginWithEmail(page, accounts.free);
  await page.goto("/admin_dashboard");

  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin_dashboard$/);

  const cookieHeader = await getAuthCookieHeader(accounts.free);
  const api = await playwrightRequest.newContext({
    baseURL: getPlaywrightBaseUrl(),
    extraHTTPHeaders: {
      cookie: cookieHeader,
    },
  });

  try {
    const response = await api.get("/api/admin/metrics");
    expect(response.status()).toBe(401);
  } finally {
    await api.dispose();
  }
});
