import { expect, test, type Page } from "@playwright/test";
import { getPlaywrightBaseUrl } from "@/lib/testing/playwright";

const BASE_URL = getPlaywrightBaseUrl();
const LANG_STORAGE_KEY = "fazumi_lang";

async function setLocale(page: Page, locale: "en" | "ar") {
  await page.context().addCookies([
    {
      name: LANG_STORAGE_KEY,
      value: locale,
      url: BASE_URL,
      sameSite: "Lax",
    },
  ]);

  await page.addInitScript(
    ({ localeValue, storageKey }) => {
      try {
        window.localStorage.setItem(storageKey, localeValue);
      } catch {
        // Ignore storage failures in restrictive documents.
      }

      document.cookie = `${storageKey}=${localeValue}; path=/`;
      document.documentElement.lang = localeValue;
      document.documentElement.dir = localeValue === "ar" ? "rtl" : "ltr";
    },
    { localeValue: locale, storageKey: LANG_STORAGE_KEY }
  );
}

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
    path: "/cookie-policy",
    assertVisible: (page) =>
      page.getByRole("heading", { name: /Cookie Policy/i }),
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

test("public about: Arabic locale renders with RTL and no unverified trust claims", async ({
  page,
}) => {
  await setLocale(page, "ar");

  const response = await page.goto("/about");

  expect(response?.status(), "Expected /about to return 200.").toBe(200);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(
    page.getByRole("heading", { name: "صُمم من قبل أولياء الأمور، لأولياء الأمور" })
  ).toBeVisible();
  await expect(page.getByText("إشارة ثقة", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText(
      "يستخدمه أكثر من 12,500 ولي أمر في قطر والإمارات والسعودية والكويت والبحرين وعمان.",
      { exact: true }
    )
  ).toHaveCount(0);
  await expect(
    page.getByText(
      "موثوق من العائلات المشغولة يستخدمه أكثر من 12,500 ولي أمر في قطر والإمارات والسعودية والكويت والبحرين وعمان.",
      { exact: true }
    )
  ).toHaveCount(0);
  await expect(page.getByText("ما الذي نركز عليه", { exact: true })).toBeVisible();
});

test("public cookie policy: Arabic copy uses categories instead of brittle cookie-name tables", async ({
  page,
}) => {
  await setLocale(page, "ar");

  const response = await page.goto("/cookie-policy");

  expect(response?.status(), "Expected /cookie-policy to return 200.").toBe(200);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "سياسة ملفات الارتباط" })).toBeVisible();
  await expect(page.getByText("قد تختلف أسماء ملفات الارتباط ومفاتيح التخزين", { exact: false })).toBeVisible();
  await expect(
    page.getByText("sb-<project-ref>-auth-token / supabase-auth-token", { exact: true })
  ).toHaveCount(0);
  await expect(page.getByText("fazumi_region", { exact: true })).toHaveCount(0);
  await expect(page.getByText("fazumi_lang", { exact: true })).toHaveCount(0);
});

for (const locale of ["en", "ar"] as const) {
  test(`404 route renders in ${locale.toUpperCase()} locale`, async ({ page }) => {
    await setLocale(page, locale);

    const response = await page.goto(`/missing-route-${locale}-404-check`);

    expect(response?.status(), "Expected missing route to return 404.").toBe(404);
    await expect(page.locator("main")).toHaveAttribute(
      "dir",
      locale === "ar" ? "rtl" : "ltr"
    );
    await expect(
      page.getByRole("heading", {
        name: locale === "ar" ? "الصفحة غير موجودة" : "Page not found",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: locale === "ar" ? "العودة للرئيسية" : "Go home",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: locale === "ar" ? "تواصل مع الدعم" : "Contact support",
      })
    ).toBeVisible();
  });
}
