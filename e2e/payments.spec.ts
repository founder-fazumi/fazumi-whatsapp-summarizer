import { expect, test } from "@playwright/test";
import {
  ensureTestAccounts,
  getDevEnv,
  getMissingWebhookReplayEnv,
  hasSubscriptionPortalColumns,
  getSubscription,
  loginWithEmail,
  postWebhookFixture,
  resetTestUser,
  updateSubscriptionStatus,
} from "./support";

test.describe.configure({ mode: "serial" });

test("billing lifecycle smoke: replayed Lemon Squeezy webhooks update UI without checkout", async ({ page, request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for webhook smoke."
  );

  const missingWebhookEnv = getMissingWebhookReplayEnv();
  test.skip(
    missingWebhookEnv.length > 0,
    `Missing webhook replay env: ${missingWebhookEnv.join(", ")}`
  );
  test.skip(
    !(await hasSubscriptionPortalColumns()),
    "subscriptions portal URL columns are missing locally. Apply the existing portal URL migration before running webhook replay smoke."
  );

  const accounts = await ensureTestAccounts(request);
  await resetTestUser(accounts.paid.email, { plan: "monthly", clearSubscriptions: true });

  await postWebhookFixture("subscription_payment_success");
  await postWebhookFixture("subscription_updated_active");

  const subscription = await getSubscription("sub_test_monthly_001");
  expect(subscription?.status).toBe("active");
  expect(subscription?.ls_customer_portal_url).toBeTruthy();
  expect(subscription?.ls_update_payment_method_url).toBeTruthy();

  await loginWithEmail(page, accounts.paid);
  await page.goto("/dashboard?upgraded=1");

  await expect(page.getByTestId("upgrading-banner")).toBeVisible();
  await page.waitForURL("**/dashboard", { timeout: 10_000 });

  await page.goto("/billing");
  await expect(page.getByTestId("billing-manage-subscription")).toBeVisible();

  await updateSubscriptionStatus("sub_test_monthly_001", "past_due");
  await page.reload();
  await expect(page.getByTestId("billing-update-payment")).toBeVisible();

  await postWebhookFixture("subscription_updated_active");
  await page.reload();
  await expect(page.getByTestId("billing-update-payment")).toHaveCount(0);
  await expect(page.getByTestId("billing-manage-subscription")).toBeVisible();
});
