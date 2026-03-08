import { expect, test, type Page } from "@playwright/test";
import { getPlaywrightBaseUrl } from "@/lib/testing/playwright";

const BASE_URL = getPlaywrightBaseUrl();
const LANG_STORAGE_KEY = "fazumi_lang";

async function clearLocaleState(page: Page) {
  await page.context().clearCookies();
  await page.addInitScript(({ storageKey }) => {
    try {
      window.localStorage.removeItem(storageKey);
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore storage failures in restrictive documents.
    }

    document.cookie = `${storageKey}=; path=/; max-age=0`;
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  }, { storageKey: LANG_STORAGE_KEY });
}

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

test.beforeEach(async ({ page }) => {
  await clearLocaleState(page);
});

type PublicRoute = {
  path: string;
  assertVisible: (page: Page) => ReturnType<Page["locator"]>;
};

const PUBLIC_ROUTES: PublicRoute[] = [
  {
    path: "/",
    assertVisible: (page) =>
      page.getByRole("button", { name: /أنشئ ملخصًا تجريبيًا/i }),
  },
  {
    path: "/pricing",
    assertVisible: (page) =>
      page.getByRole("heading", { name: /ثلاث خطط\. مسار واضح واحد\./i }),
  },
  {
    path: "/about",
    assertVisible: (page) =>
      page.getByRole("heading", { name: /صُمم من قبل أولياء الأمور، لأولياء الأمور/i }),
  },
  {
    path: "/help",
    assertVisible: (page) =>
      page.getByRole("heading", { name: /المساعدة والدعم/i }),
  },
  {
    path: "/privacy",
    assertVisible: (page) =>
      page.getByRole("heading", { name: /سياسة الخصوصية/i }),
  },
  {
    path: "/cookie-policy",
    assertVisible: (page) =>
      page.getByRole("heading", { name: /سياسة ملفات الارتباط/i }),
  },
  {
    path: "/terms",
    assertVisible: (page) =>
      page.getByRole("heading", { name: /شروط الخدمة/i }),
  },
  {
    path: "/status",
    assertVisible: (page) =>
      page.getByRole("heading", { name: /حالة النظام/i }),
  },
];

for (const route of PUBLIC_ROUTES) {
  test(`public smoke: ${route.path} renders with the Arabic-first default`, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response?.status(), `Expected ${route.path} to return 200.`).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(route.assertVisible(page)).toBeVisible();
  });
}

test("founder page redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/founder");
  await expect(page).toHaveURL(/\/login/);
});

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
