import { expect, test, type Page } from "@playwright/test";

type PublicRoute = {
  path: string;
  assertVisible: (page: Page) => ReturnType<Page["locator"]>;
};

const PUBLIC_ROUTES: PublicRoute[] = [
  {
    path: "/",
    assertVisible: (page) =>
      page.getByRole("link", { name: /Get your summary/i }),
  },
  {
    path: "/pricing",
    assertVisible: (page) =>
      page.getByRole("heading", { name: /Three plans\. One clear path\./i }),
  },
  {
    path: "/about",
    assertVisible: (page) =>
      page.getByRole("heading", { name: /Built by parents, for parents/i }),
  },
  {
    path: "/help",
    assertVisible: (page) =>
      page.getByRole("heading", { name: /Help & Support/i }),
  },
  {
    path: "/privacy",
    assertVisible: (page) =>
      page.getByRole("heading", { name: /Privacy Policy/i }),
  },
  {
    path: "/terms",
    assertVisible: (page) =>
      page.getByRole("heading", { name: /Terms of Service/i }),
  },
  {
    path: "/status",
    assertVisible: (page) =>
      page.getByRole("heading", { name: /System Status/i }),
  },
];

for (const route of PUBLIC_ROUTES) {
  test(`public smoke: ${route.path} renders`, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response?.status(), `Expected ${route.path} to return 200.`).toBe(200);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(route.assertVisible(page)).toBeVisible();
  });
}
