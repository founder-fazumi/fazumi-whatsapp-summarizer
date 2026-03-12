import { expect, test, type Page } from "@playwright/test";
import {
  ensureTestAccounts,
  expectNoHorizontalOverflow,
  getDevEnv,
  loginWithEmail,
  openSummarizePage,
  resetTestUser,
} from "./support";

type RouteCheck = {
  path: string;
  ready: (page: Page) => ReturnType<Page["locator"]>;
};

const PUBLIC_ROUTE_CHECKS: RouteCheck[] = [
  {
    path: "/",
    ready: (page) => page.getByRole("button", { name: /أنشئ ملخصًا تجريبيًا/i }),
  },
  {
    path: "/pricing",
    ready: (page) => page.getByRole("heading", { name: /خطط بسيطة لأولياء الأمور المشغولين\./i }),
  },
  {
    path: "/about",
    ready: (page) =>
      page.getByRole("heading", { name: /صُمم من قبل أولياء الأمور، لأولياء الأمور/i }),
  },
  {
    path: "/login",
    ready: (page) => page.locator("#login-email"),
  },
  {
    path: "/founder-supporter",
    ready: (page) =>
      page.getByRole("heading", {
        name: /حوّل فوضى رسائل المدرسة على واتساب إلى خطوات واضحة/i,
      }),
  },
];

async function assertPublicRoutesHaveNoOverflow(page: Page, width: number) {
  for (const route of PUBLIC_ROUTE_CHECKS) {
    const response = await page.goto(route.path);
    expect(response?.status(), `Expected ${route.path} to return 200.`).toBe(200);
    await expect(route.ready(page)).toBeVisible();
    await expectNoHorizontalOverflow(page, `${route.path} at ${width}px`);
  }
}

async function assertAuthenticatedRoutesHaveNoOverflow(page: Page, width: number) {
  const response = await page.goto("/dashboard");
  expect(response?.status(), "Expected /dashboard to return 200 for an authenticated user.").toBe(200);
  await expect(page.getByRole("main")).toBeVisible();
  await expectNoHorizontalOverflow(page, `/dashboard at ${width}px`);

  await openSummarizePage(page);
  await expectNoHorizontalOverflow(page, `/summarize composer at ${width}px`);

  await page.getByTestId("summary-use-sample").click();
  await page.getByTestId("summary-submit").click();
  await expect(page.getByTestId("summary-saved-banner")).toBeVisible({ timeout: 90_000 });
  await expectNoHorizontalOverflow(page, `/summarize result at ${width}px`);
}

for (const width of [375, 320] as const) {
  test.describe(`mobile overflow smoke ${width}px`, () => {
    test.use({
      viewport: { width, height: 812 },
      isMobile: true,
      hasTouch: true,
    });

    test(`public routes stay within the viewport at ${width}px`, async ({ page }) => {
      await assertPublicRoutesHaveNoOverflow(page, width);
    });

    test(`authenticated dashboard and summarize stay within the viewport at ${width}px`, async ({
      page,
      request,
    }) => {
      const env = await getDevEnv(request);
      test.skip(
        !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
        env.hint ?? "Supabase dev env is required for mobile overflow auth coverage."
      );

      const accounts = await ensureTestAccounts(request);
      await resetTestUser(accounts.paid.email, { plan: "monthly" });
      await loginWithEmail(page, accounts.paid);
      await assertAuthenticatedRoutesHaveNoOverflow(page, width);
    });
  });
}
