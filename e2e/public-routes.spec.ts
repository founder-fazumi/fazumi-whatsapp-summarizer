import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = [
  { path: "/", heading: /Turn school group chats/i },
  { path: "/pricing", heading: /Simple, transparent pricing/i },
  { path: "/about", heading: /About Fazumi/i },
  { path: "/help", heading: /Help & Support/i },
  { path: "/privacy", heading: /Privacy Policy/i },
  { path: "/terms", heading: /Terms of Service/i },
  { path: "/status", heading: /System Status/i },
] as const;

for (const route of PUBLIC_ROUTES) {
  test(`public smoke: ${route.path} renders`, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response?.status(), `Expected ${route.path} to return 200.`).toBe(200);
    await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
  });
}
