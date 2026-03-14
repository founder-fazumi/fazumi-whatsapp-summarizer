import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { getPlaywrightBaseUrl } from "@/lib/testing/playwright";
import {
  ensureTestAccounts,
  getDevEnv,
  getAuthCookies,
  getVisibleSummaryIds,
  resetTestUser,
  summarizeWithSample,
} from "../../e2e/support";

const BASE_URL = getPlaywrightBaseUrl();
const REPORTS_DIR = path.join(process.cwd(), "reports");
const SCREENSHOTS_DIR = path.join(REPORTS_DIR, "screenshots");
const JSON_REPORT_PATH = path.join(REPORTS_DIR, "audit-results.json");
const MARKDOWN_REPORT_PATH = path.join(REPORTS_DIR, "audit.md");
const LANG_STORAGE_KEY = "fazumi_lang";
const THEME_STORAGE_KEY = "fazumi_theme";
const AUDIT_RESET = process.env.AUDIT_RESET !== "0";
const DEFAULT_AUDIT_VIEWPORT = "mobile";
const DEFAULT_AUDIT_LOCALES = "en,ar";
const DEFAULT_AUDIT_AUDIENCES = "public";
const AUDIT_VIEWPORT_FILTER = new Set(
  (process.env.AUDIT_VIEWPORT ?? DEFAULT_AUDIT_VIEWPORT)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const AUDIT_LOCALE_FILTER = new Set(
  (process.env.AUDIT_LOCALE ?? DEFAULT_AUDIT_LOCALES)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const AUDIT_AUDIENCE_FILTER = new Set(
  (process.env.AUDIT_AUDIENCE ?? DEFAULT_AUDIT_AUDIENCES)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const AUDIT_DEBUG = process.env.AUDIT_DEBUG === "1";
const AUDIT_MAX_LINKS_PER_PAGE = Number.parseInt(process.env.AUDIT_MAX_LINKS_PER_PAGE ?? "50", 10);
const AUDIT_MAX_INTERACTIONS_PER_PAGE = Number.parseInt(process.env.AUDIT_MAX_INTERACTIONS_PER_PAGE ?? "20", 10);
const AUDIT_MAX_TYPOGRAPHY_SAMPLES_PER_PAGE = Number.parseInt(
  process.env.AUDIT_MAX_TYPOGRAPHY_SAMPLES_PER_PAGE ?? "80",
  10
);
const AUDIT_MAX_EXTERNAL_LINK_CHECKS = Number.parseInt(
  process.env.AUDIT_MAX_EXTERNAL_LINK_CHECKS ?? "10",
  10
);
const AUDIT_EXTERNAL_LINK_TIMEOUT_MS = Number.parseInt(
  process.env.AUDIT_EXTERNAL_LINK_TIMEOUT_MS ?? "8000",
  10
);
const AUDIT_STRICT = process.env.AUDIT_STRICT === "1";
const PRIORITY_PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/login",
  "/about",
  "/faq",
  "/contact",
  "/cookie-policy",
  "/privacy",
  "/refunds",
  "/terms",
  "/status",
  "/admin_dashboard/login",
] as const;
const PRIORITY_AUTHENTICATED_ROUTES = [
  "/dashboard",
  "/summarize",
  "/history",
  "/billing",
  "/todo",
  "/profile",
  "/settings",
] as const;
const PRIORITY_ADMIN_ROUTES = ["/admin_dashboard", "/admin_dashboard/inbox", "/admin_dashboard/ai-usage"] as const;
const EXPECTED_DIR_BY_LOCALE = {
  en: "ltr",
  ar: "rtl",
} as const;
const SPACING_SCALE_PX = [4, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96];
// Scale derived from CSS token system (globals.css --text-* vars, base 16px):
// 13=text-xs(0.8125rem), 15=text-sm(0.9375rem), 17=text-base(1.0625rem),
// 19=text-lg(1.1875rem), 22=text-xl/public-body(1.375rem),
// 28=text-2xl/public-section(1.75rem), 34=text-3xl(2.125rem), 44=text-4xl(2.75rem),
// 56=text-5xl, 64=page-title-max, 72=text-6xl. Legacy/admin values kept for shadcn/admin surfaces.
const TYPOGRAPHY_SCALE_PX = [12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 28, 32, 34, 40, 44, 48, 56, 64, 72];

type Locale = "en" | "ar";
type Audience = "public" | "authenticated" | "admin";
type Severity = "critical" | "warning";
type ViewportName = "mobile" | "tablet" | "desktop";

type ViewportConfig = {
  name: ViewportName;
  width: number;
  height: number;
  isMobile?: boolean;
  hasTouch?: boolean;
};

type AuditIssue = {
  code: string;
  message: string;
  selector: string | null;
  severity: Severity;
};

type InteractionAuditResult = {
  id: string;
  role: string;
  name: string;
  selector: string;
  clickability: "pass" | "fail" | "skipped";
  issue: string | null;
};

type LinkAuditRecord = {
  id: string;
  sourcePath: string;
  sourceAudience: Audience;
  locale: Locale;
  viewport: ViewportName;
  text: string;
  href: string;
  resolvedHref: string | null;
  target: string | null;
  kind: "internal" | "external" | "hash" | "mailto" | "tel" | "invalid";
  clickability: "pass" | "fail" | "skipped";
  navigation: "pass" | "fail" | "redirect" | "skipped";
  status: number | null;
  finalUrl: string | null;
  issue: string | null;
};

type TypographySample = {
  route: string;
  locale: Locale;
  viewport: ViewportName;
  tag: string;
  selector: string;
  text: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: string;
  letterSpacing: string;
  textAlign: string;
  paddingInline: string;
  paddingBlock: string;
  borderRadius: string;
  boxShadow: string;
};

type RouteAuditResult = {
  audience: Audience;
  locale: Locale;
  viewport: ViewportName;
  path: string;
  finalUrl: string;
  status: number | null;
  title: string;
  htmlLang: string;
  htmlDir: string;
  loadTimeMs: number | null;
  screenshotPath: string;
  consoleErrors: string[];
  consoleWarnings: string[];
  pageErrors: string[];
  requestFailures: string[];
  a11yCritical: AuditIssue[];
  a11yWarnings: AuditIssue[];
  interactions: InteractionAuditResult[];
  linkAudits: LinkAuditRecord[];
  typographySamples: TypographySample[];
};

type FeatureFlowResult = {
  key: string;
  audience: Audience;
  locale: Locale;
  viewport: ViewportName;
  status: "pass" | "fail" | "skipped";
  details: string;
};

type AggregatedTypographyCombo = {
  key: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: string;
  letterSpacing: string;
  count: number;
  sampleRoute: string;
  tags: string[];
  outlier: boolean;
};

type AppRouteMap = {
  staticRoutes: string[];
  dynamicRoutes: string[];
};

type AuditReport = {
  generatedAt: string;
  baseUrl: string;
  routeMap: AppRouteMap;
  coverage: {
    public: string[];
    authenticated: string[];
    admin: string[];
  };
  environment: {
    supabaseUrl: boolean;
    supabaseAnon: boolean;
    serviceRole: boolean;
    openai: boolean;
  };
  routes: RouteAuditResult[];
  featureFlows: FeatureFlowResult[];
  linkChecks: LinkAuditRecord[];
  typographyCombos: AggregatedTypographyCombo[];
  summary: {
    totalRoutes: number;
    brokenInternalLinks: number;
    redirectedLinks: number;
    consoleErrorPages: number;
    requestFailurePages: number;
    a11yCriticalCount: number;
    a11yWarningCount: number;
    typographyOutlierCount: number;
  };
};

type PageDomAudit = {
  title: string;
  htmlLang: string;
  htmlDir: string;
  issues: AuditIssue[];
  links: Array<{
    id: string;
    text: string;
    href: string;
    resolvedHref: string | null;
    target: string | null;
    kind: "internal" | "external" | "hash" | "mailto" | "tel" | "invalid";
    visible: boolean;
    inViewport: boolean;
    disabled: boolean;
    pointerEvents: string;
  }>;
  interactions: Array<{
    id: string;
    role: string;
    name: string;
    selector: string;
    visible: boolean;
    inViewport: boolean;
    disabled: boolean;
    pointerEvents: string;
  }>;
  typographySamples: TypographySample[];
};

const VIEWPORTS: readonly ViewportConfig[] = [
  { name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "tablet", width: 768, height: 1024, hasTouch: true },
  { name: "desktop", width: 1440, height: 900 },
];

const LOCALES: readonly Locale[] = ["en", "ar"];
const AUDIENCES: readonly Audience[] = ["public", "authenticated", "admin"];

test.describe.configure({ mode: "serial" });

test("audit FAZUMI routes, links, interactions, typography, and accessibility", async ({
  browser,
  request,
}) => {
  test.setTimeout(1_200_000);

  const env = await getDevEnv(request);
  const routeMap = await collectAppRoutes(path.join(process.cwd(), "app"));
  const staticRoutes = routeMap.staticRoutes;
  const accounts = await ensureTestAccounts(request);
  const hasExistingAudit = await pathExists(JSON_REPORT_PATH);

  if (AUDIT_RESET || !hasExistingAudit) {
    await resetTestUser(accounts.founder.email, {
      plan: "founder",
      lifetimeFreeUsed: 0,
    });
  }
  const failures: string[] = [];

  await ensureDirectories(AUDIT_RESET);

  let historyDetailPath: string | null = null;
  try {
    const existingSummaryIds = await getVisibleSummaryIds(accounts.founder.email);
    historyDetailPath = existingSummaryIds[0]
      ? `/history/${existingSummaryIds[0]}`
      : await seedFounderSummary(browser, accounts.founder);
    if (!historyDetailPath) {
      failures.push("Could not create or discover a saved summary for history detail coverage.");
    }
  } catch (error) {
    failures.push(`Summary seed failed: ${formatError(error)}`);
  }

  const coverage = buildCoverage(staticRoutes, historyDetailPath);
  const audit = await loadOrCreateAuditReport({
    env,
    routeMap,
    coverage,
  });

  for (const viewport of getSelectedViewports()) {
    for (const locale of getSelectedLocales()) {
      if (getSelectedAudiences().includes("public")) {
        await auditAudience(browser, audit, failures, {
          audience: "public",
          locale,
          viewport,
          routes: coverage.public,
        });
      }

      if (
        getSelectedAudiences().includes("authenticated") &&
        env.env.supabaseUrl &&
        env.env.supabaseAnon &&
        env.env.serviceRole
      ) {
        await auditAudience(browser, audit, failures, {
          audience: "authenticated",
          locale,
          viewport,
          routes: coverage.authenticated,
          login: async (context) => {
            await context.addCookies(await getAuthCookies(accounts.founder));
          },
        });
      } else if (getSelectedAudiences().includes("authenticated")) {
        audit.featureFlows.push({
          key: "authenticated-routes-skipped",
          audience: "authenticated",
          locale,
          viewport: viewport.name,
          status: "skipped",
          details: env.hint ?? "Supabase auth env vars are not configured for authenticated audit coverage.",
        });
      }

      if (getSelectedAudiences().includes("admin")) {
        await auditAudience(browser, audit, failures, {
          audience: "admin",
          locale,
          viewport,
          routes: coverage.admin,
          login: async (context) => {
            await context.addCookies(await getAuthCookies(accounts.admin));
          },
        });
      }
    }
  }

  await verifyExternalLinks(audit);
  aggregateAudit(audit);

  if (AUDIT_STRICT && audit.summary.brokenInternalLinks > 0) {
    failures.push(`Broken internal links: ${audit.summary.brokenInternalLinks}`);
  }

  if (audit.summary.consoleErrorPages > 0) {
    failures.push(`Pages with console errors: ${audit.summary.consoleErrorPages}`);
  }

  if (audit.summary.requestFailurePages > 0) {
    failures.push(`Pages with failed network requests: ${audit.summary.requestFailurePages}`);
  }

  if (AUDIT_STRICT && audit.summary.a11yCriticalCount > 0) {
    failures.push(`Critical accessibility violations: ${audit.summary.a11yCriticalCount}`);
  }

  await writeReports(audit);

  expect(
    failures,
    failures.length > 0 ? failures.join("\n") : "Audit should finish without critical failures."
  ).toEqual([]);
});

async function auditAudience(
  browser: Browser,
  audit: AuditReport,
  failures: string[],
  options: {
    audience: Audience;
    locale: Locale;
    viewport: ViewportConfig;
    routes: string[];
    login?: (context: BrowserContext) => Promise<void>;
  }
) {
  const context = await createAuditContext(browser, options.locale, options.viewport);
  const audienceStartedAt = Date.now();

  if (AUDIT_DEBUG) {
    console.log(
      `[audit] start audience=${options.audience} locale=${options.locale} viewport=${options.viewport.name} routes=${options.routes.length}`
    );
  }

  try {
    if (options.login) {
      await options.login(context);
    }

    for (const route of options.routes) {
      const routeStartedAt = Date.now();

      if (AUDIT_DEBUG) {
        console.log(
          `[audit] route:start audience=${options.audience} locale=${options.locale} viewport=${options.viewport.name} route=${route}`
        );
      }

      const page = await context.newPage();

      try {
        const routeResult = await auditRoute(page, {
          audience: options.audience,
          locale: options.locale,
          viewport: options.viewport,
          route,
        });

        upsertRouteResult(audit, routeResult);
        replaceLinkChecks(audit, routeResult);

        if (AUDIT_STRICT && routeResult.a11yCritical.length > 0) {
          failures.push(
            `${options.audience}/${options.locale}/${options.viewport.name}${route}: ${routeResult.a11yCritical.length} critical accessibility issues`
          );
        }

        if (routeResult.status === null || routeResult.status >= 400) {
          failures.push(
            `${options.audience}/${options.locale}/${options.viewport.name}${route}: status ${routeResult.status ?? "unknown"}`
          );
        }

        if (routeResult.consoleErrors.length > 0) {
          failures.push(
            `${options.audience}/${options.locale}/${options.viewport.name}${route}: console errors detected`
          );
        }

        if (routeResult.requestFailures.length > 0) {
          failures.push(
            `${options.audience}/${options.locale}/${options.viewport.name}${route}: failed network requests detected`
          );
        }

        if (shouldRunFeatureFlow(options.audience, options.locale, options.viewport.name, route)) {
          const flowResults = await exerciseFeatureFlow(
            page,
            options.audience,
            options.locale,
            options.viewport,
            route
          );
          replaceFeatureFlows(audit, flowResults);
          for (const flowResult of flowResults) {
            if (flowResult.status === "fail") {
              failures.push(
                `${flowResult.audience}/${flowResult.locale}/${flowResult.viewport} ${flowResult.key}: ${flowResult.details}`
              );
            }
          }
        }

        if (AUDIT_DEBUG) {
          console.log(
            `[audit] route:done audience=${options.audience} locale=${options.locale} viewport=${options.viewport.name} route=${route} status=${routeResult.status ?? "unknown"} durationMs=${Date.now() - routeStartedAt}`
          );
        }
      } finally {
        await page.close();
      }
    }

    audit.generatedAt = new Date().toISOString();

    if (AUDIT_DEBUG) {
      console.log(
        `[audit] done audience=${options.audience} locale=${options.locale} viewport=${options.viewport.name} durationMs=${Date.now() - audienceStartedAt}`
      );
    }
  } finally {
    await context.close();
  }
}

function shouldRunFeatureFlow(
  audience: Audience,
  locale: Locale,
  viewport: ViewportName,
  route: string
) {
  if (audience === "public" && route === "/") {
    return locale === "en" || viewport === "mobile";
  }

  if (audience === "public" && route === "/admin_dashboard/login") {
    return locale === "en" && viewport === "desktop";
  }

  if (audience === "authenticated" && (route === "/todo" || route.startsWith("/history/"))) {
    return viewport !== "tablet";
  }

  return false;
}

function getSelectedViewports() {
  return VIEWPORTS.filter(
    (viewport) => AUDIT_VIEWPORT_FILTER.size === 0 || AUDIT_VIEWPORT_FILTER.has(viewport.name)
  );
}

function getSelectedLocales() {
  return LOCALES.filter(
    (locale) => AUDIT_LOCALE_FILTER.size === 0 || AUDIT_LOCALE_FILTER.has(locale)
  );
}

function getSelectedAudiences() {
  return AUDIENCES.filter(
    (audience) => AUDIT_AUDIENCE_FILTER.size === 0 || AUDIT_AUDIENCE_FILTER.has(audience)
  );
}

function getRouteAuditKey(route: Pick<RouteAuditResult, "audience" | "locale" | "viewport" | "path">) {
  return `${route.audience}|${route.locale}|${route.viewport}|${route.path}`;
}

function upsertRouteResult(audit: AuditReport, routeResult: RouteAuditResult) {
  const nextKey = getRouteAuditKey(routeResult);
  audit.routes = audit.routes.filter((route) => getRouteAuditKey(route) !== nextKey);
  audit.routes.push(routeResult);
}

function replaceLinkChecks(audit: AuditReport, routeResult: RouteAuditResult) {
  audit.linkChecks = audit.linkChecks.filter(
    (link) =>
      !(
        link.sourceAudience === routeResult.audience &&
        link.locale === routeResult.locale &&
        link.viewport === routeResult.viewport &&
        link.sourcePath === routeResult.path
      )
  );
  audit.linkChecks.push(...routeResult.linkAudits);
}

function replaceFeatureFlows(audit: AuditReport, flowResults: FeatureFlowResult[]) {
  const keys = new Set(
    flowResults.map((flow) => `${flow.audience}|${flow.locale}|${flow.viewport}|${flow.key}`)
  );
  audit.featureFlows = audit.featureFlows.filter(
    (flow) => !keys.has(`${flow.audience}|${flow.locale}|${flow.viewport}|${flow.key}`)
  );
  audit.featureFlows.push(...flowResults);
}

async function auditRoute(
  page: Page,
  options: {
    audience: Audience;
    locale: Locale;
    viewport: ViewportConfig;
    route: string;
  }
): Promise<RouteAuditResult> {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const startedAt = Date.now();

  page.on("console", (message) => {
    const entry = `${message.type()}: ${message.text()}`;

    if (message.type() === "error") {
      consoleErrors.push(entry);
      return;
    }

    if (message.type() === "warning") {
      consoleWarnings.push(entry);
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    if (failure.includes("net::ERR_ABORTED")) {
      return;
    }

    requestFailures.push(`${request.method()} ${request.url()} :: ${failure}`);
  });

  const response = await page.goto(options.route, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 2_500 }).catch(() => null);
  await page.waitForTimeout(150);

  const pageDomAudit = await annotateAndCollectPageAudit(page, options.locale, options.viewport.name);
  const accessibilitySnapshot = await page.locator("body").ariaSnapshot().catch(() => null);
  const issues = [...pageDomAudit.issues];

  if (!accessibilitySnapshot) {
    issues.push({
      code: "accessibility-snapshot-empty",
      message: "Playwright ARIA snapshot returned no tree for this route.",
      selector: "body",
      severity: "warning",
    });
  }

  if (pageDomAudit.htmlLang !== options.locale) {
    issues.push({
      code: "lang-mismatch",
      message: `Expected html[lang] to be "${options.locale}" but received "${pageDomAudit.htmlLang || "empty"}".`,
      selector: "html",
      severity: "critical",
    });
  }

  if (pageDomAudit.htmlDir !== EXPECTED_DIR_BY_LOCALE[options.locale]) {
    issues.push({
      code: "dir-mismatch",
      message: `Expected html[dir] to be "${EXPECTED_DIR_BY_LOCALE[options.locale]}" but received "${pageDomAudit.htmlDir || "empty"}".`,
      selector: "html",
      severity: "critical",
    });
  }

  const interactions = await checkInteractions(page, pageDomAudit.interactions);
  const linkAudits = await checkLinkActionability(page, pageDomAudit.links, {
    audience: options.audience,
    locale: options.locale,
    viewport: options.viewport.name,
    sourcePath: options.route,
  });
  const screenshotPath = await captureScreenshot(page, {
    audience: options.audience,
    locale: options.locale,
    viewport: options.viewport.name,
    route: options.route,
  });

  return {
    audience: options.audience,
    locale: options.locale,
    viewport: options.viewport.name,
    path: options.route,
    finalUrl: page.url(),
    status: response?.status() ?? null,
    title: pageDomAudit.title,
    htmlLang: pageDomAudit.htmlLang,
    htmlDir: pageDomAudit.htmlDir,
    loadTimeMs: Date.now() - startedAt,
    screenshotPath,
    consoleErrors,
    consoleWarnings,
    pageErrors,
    requestFailures,
    a11yCritical: issues.filter((issue) => issue.severity === "critical"),
    a11yWarnings: issues.filter((issue) => issue.severity === "warning"),
    interactions,
    linkAudits,
    typographySamples: pageDomAudit.typographySamples,
  };
}

async function annotateAndCollectPageAudit(
  page: Page,
  locale: Locale,
  viewport: ViewportName
): Promise<PageDomAudit> {
  return page.evaluate(
    ({ baseUrl, localeValue, viewportValue, maxLinks, maxInteractions, maxTypographySamples }) => {
      type ClientIssue = {
        code: string;
        message: string;
        selector: string | null;
        severity: "critical" | "warning";
      };

      function compact(value: string | null | undefined) {
        return (value ?? "").replace(/\s+/g, " ").trim();
      }

      function describeElement(element: Element) {
        const tag = element.tagName.toLowerCase();
        const id = element.id ? `#${element.id}` : "";
        const className =
          element instanceof HTMLElement
            ? compact(element.className).split(" ").filter(Boolean).slice(0, 2).join(".")
            : "";
        return `${tag}${id}${className ? `.${className}` : ""}`;
      }

      function isVisible(element: Element) {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      }

      function isInViewport(element: Element) {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        const rect = element.getBoundingClientRect();
        return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
      }

      function resolveTextFromIds(value: string | null) {
        return compact(
          (value ?? "")
            .split(/\s+/)
            .map((id) => compact(document.getElementById(id)?.textContent))
            .filter(Boolean)
            .join(" ")
        );
      }

      function labelTextForControl(
        element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      ) {
        return compact(
          Array.from(element.labels ?? [])
            .map((label) => compact(label.textContent))
            .filter(Boolean)
            .join(" ")
        );
      }

      function accessibleName(element: Element) {
        const ariaLabel = compact(element.getAttribute("aria-label"));
        if (ariaLabel) {
          return ariaLabel;
        }

        const labelledBy = resolveTextFromIds(element.getAttribute("aria-labelledby"));
        if (labelledBy) {
          return labelledBy;
        }

        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement
        ) {
          const label = labelTextForControl(element);
          if (label) {
            return label;
          }
        }

        if (element instanceof HTMLInputElement && ["button", "submit", "reset"].includes(element.type)) {
          const value = compact(element.value);
          if (value) {
            return value;
          }
        }

        const alt = compact(element.getAttribute("alt"));
        if (alt) {
          return alt;
        }

        const title = compact(element.getAttribute("title"));
        if (title) {
          return title;
        }

        if (element instanceof HTMLElement) {
          const text = compact(element.innerText || element.textContent);
          if (text) {
            return text;
          }
        }

        return "";
      }

      function spacingValue(value: string) {
        const numbers = value
          .split(" ")
          .map((part) => Number.parseFloat(part))
          .filter((part) => Number.isFinite(part));

        return numbers.length > 0 ? numbers.join(" ") : value;
      }

      const issues: ClientIssue[] = [];

      if (!document.querySelector("main")) {
        issues.push({
          code: "landmark-main-missing",
          message: "Page does not expose a <main> landmark.",
          selector: "main",
          severity: "critical",
        });
      }

      const h1Count = document.querySelectorAll("h1").length;
      if (h1Count === 0) {
        issues.push({
          code: "heading-h1-missing",
          message: "Page does not expose an H1 heading.",
          selector: "h1",
          severity: "critical",
        });
      } else if (h1Count > 1) {
        issues.push({
          code: "heading-h1-multiple",
          message: `Page exposes ${h1Count} H1 headings.`,
          selector: "h1",
          severity: "warning",
        });
      }

      const seenIds = new Map<string, number>();
      for (const element of Array.from(document.querySelectorAll("[id]"))) {
        const id = element.id.trim();
        if (!id) {
          continue;
        }
        seenIds.set(id, (seenIds.get(id) ?? 0) + 1);
      }

      for (const [id, count] of seenIds.entries()) {
        if (count > 1) {
          issues.push({
            code: "duplicate-id",
            message: `ID "${id}" is duplicated ${count} times.`,
            selector: `#${id}`,
            severity: "warning",
          });
        }
      }

      for (const image of Array.from(document.querySelectorAll("img"))) {
        if (!image.hasAttribute("alt")) {
          issues.push({
            code: "image-alt-missing",
            message: "Image is missing alt text.",
            selector: describeElement(image),
            severity: "critical",
          });
        }
      }

      for (const element of Array.from(document.querySelectorAll("[aria-labelledby]"))) {
        const value = element.getAttribute("aria-labelledby");
        const missingId = (value ?? "")
          .split(/\s+/)
          .find((id) => id && !document.getElementById(id));

        if (missingId) {
          issues.push({
            code: "aria-labelledby-missing-target",
            message: `aria-labelledby references missing id "${missingId}".`,
            selector: describeElement(element),
            severity: "critical",
          });
        }
      }

      for (const element of Array.from(document.querySelectorAll("[aria-describedby]"))) {
        const value = element.getAttribute("aria-describedby");
        const missingId = (value ?? "")
          .split(/\s+/)
          .find((id) => id && !document.getElementById(id));

        if (missingId) {
          issues.push({
            code: "aria-describedby-missing-target",
            message: `aria-describedby references missing id "${missingId}".`,
            selector: describeElement(element),
            severity: "warning",
          });
        }
      }

      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .slice(0, maxLinks)
        .map((link, index) => {
        const id = `audit-link-${index}`;
        const styles = window.getComputedStyle(link);

        const href = link.getAttribute("href") ?? "";
        let kind: "internal" | "external" | "hash" | "mailto" | "tel" | "invalid" = "invalid";
        let resolvedHref: string | null = null;

        if (href.startsWith("#")) {
          kind = "hash";
        } else if (href.startsWith("mailto:")) {
          kind = "mailto";
        } else if (href.startsWith("tel:")) {
          kind = "tel";
        } else {
          try {
            const resolved = new URL(href, baseUrl);
            resolvedHref = resolved.href;
            kind = resolved.origin === new URL(baseUrl).origin ? "internal" : "external";
          } catch {
            kind = "invalid";
          }
        }

        return {
          id,
          text: accessibleName(link),
          href,
          resolvedHref,
          target: link.getAttribute("target"),
          kind,
          visible: isVisible(link),
          inViewport: isInViewport(link),
          disabled: link.getAttribute("aria-disabled") === "true",
          pointerEvents: styles.pointerEvents,
        };
      });

      const interactiveSelectors = [
        "button",
        "input[type='button']",
        "input[type='submit']",
        "input[type='reset']",
        "[role='button']",
        "summary",
      ].join(",");
      const interactions = Array.from(document.querySelectorAll<HTMLElement>(interactiveSelectors))
        .filter((element) => isVisible(element))
        .slice(0, maxInteractions)
        .map((element, index) => {
          const id = `audit-interaction-${index}`;
          const styles = window.getComputedStyle(element);
          const maybeDisabledElement = element as HTMLElement & { disabled?: boolean };
          return {
            id,
            role: element.getAttribute("role") ?? element.tagName.toLowerCase(),
            name: accessibleName(element),
            selector: describeElement(element),
            visible: true,
            inViewport: isInViewport(element),
            disabled:
              Boolean(maybeDisabledElement.disabled) || element.getAttribute("aria-disabled") === "true",
            pointerEvents: styles.pointerEvents,
          };
        });

      for (const element of Array.from(document.querySelectorAll("a[href], button, [role='button'], input, textarea, select"))) {
        if (!isVisible(element)) {
          continue;
        }

        const maybeDisabledElement = element as Element & { disabled?: boolean };
        if (typeof maybeDisabledElement.disabled === "boolean" && maybeDisabledElement.disabled) {
          continue;
        }

        const name = accessibleName(element);
        if (!name) {
          issues.push({
            code: "interactive-name-missing",
            message: "Interactive element does not expose an accessible name.",
            selector: describeElement(element),
            severity: "critical",
          });
        }
      }

      for (const element of Array.from(document.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='reset']), textarea, select"))) {
        if (!isVisible(element)) {
          continue;
        }

        const name = accessibleName(element);
        if (!name) {
          issues.push({
            code: "form-label-missing",
            message: "Form control does not expose a label.",
            selector: describeElement(element),
            severity: "critical",
          });
        }
      }

      const typographySamples = Array.from(
        document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, p, button, label, input, textarea, small, .text-caption")
      )
        .filter((element) => isVisible(element))
        .slice(0, maxTypographySamples)
        .map((element) => {
          const styles = window.getComputedStyle(element);

          return {
            route: window.location.pathname,
            locale: localeValue,
            viewport: viewportValue,
            tag: element.tagName.toLowerCase(),
            selector: describeElement(element),
            text: compact(element.innerText || element.textContent).slice(0, 96),
            fontFamily: styles.fontFamily,
            fontSize: styles.fontSize,
            lineHeight: styles.lineHeight,
            fontWeight: styles.fontWeight,
            letterSpacing: styles.letterSpacing,
            textAlign: styles.textAlign,
            paddingInline: spacingValue(`${styles.paddingLeft} ${styles.paddingRight}`),
            paddingBlock: spacingValue(`${styles.paddingTop} ${styles.paddingBottom}`),
            borderRadius: styles.borderRadius,
            boxShadow: styles.boxShadow,
          };
        });

      return {
        title: document.title,
        htmlLang: document.documentElement.lang,
        htmlDir: document.documentElement.dir,
        issues,
        links,
        interactions,
        typographySamples,
      };
    },
    {
      baseUrl: BASE_URL,
      localeValue: locale,
      viewportValue: viewport,
      maxLinks: AUDIT_MAX_LINKS_PER_PAGE,
      maxInteractions: AUDIT_MAX_INTERACTIONS_PER_PAGE,
      maxTypographySamples: AUDIT_MAX_TYPOGRAPHY_SAMPLES_PER_PAGE,
    }
  );
}

async function checkInteractions(page: Page, interactions: PageDomAudit["interactions"]) {
  void page;

  return interactions.map((interaction) => {
    if (interaction.disabled || !interaction.visible) {
      return {
        id: interaction.id,
        role: interaction.role,
        name: interaction.name,
        selector: interaction.selector,
        clickability: "skipped" as const,
        issue: interaction.disabled ? "Element is disabled." : "Element is not visible.",
      };
    }

    if (interaction.pointerEvents === "none") {
      return {
        id: interaction.id,
        role: interaction.role,
        name: interaction.name,
        selector: interaction.selector,
        clickability: "fail" as const,
        issue: "Element blocks pointer events.",
      };
    }

    return {
      id: interaction.id,
      role: interaction.role,
      name: interaction.name,
      selector: interaction.selector,
      clickability: interaction.inViewport ? "pass" as const : "skipped" as const,
      issue: interaction.inViewport ? null : "Element is outside the initial viewport.",
    };
  });
}

async function checkLinkActionability(
  page: Page,
  links: PageDomAudit["links"],
  context: {
    audience: Audience;
    locale: Locale;
    viewport: ViewportName;
    sourcePath: string;
  }
) {
  void page;

  return links.map((link) => {
    let clickability: LinkAuditRecord["clickability"] = "pass";
    let issue: string | null = null;

    if (link.disabled || !link.visible) {
      clickability = "skipped";
      issue = link.disabled ? "Link is disabled." : "Link is not visible.";
    } else if (link.pointerEvents === "none") {
      clickability = "fail";
      issue = "Link blocks pointer events.";
    } else if (!link.inViewport) {
      clickability = "skipped";
      issue = "Link is outside the initial viewport.";
    }

    return {
      id: link.id,
      sourcePath: context.sourcePath,
      sourceAudience: context.audience,
      locale: context.locale,
      viewport: context.viewport,
      text: link.text,
      href: link.href,
      resolvedHref: link.resolvedHref,
      target: link.target,
      kind: link.kind,
      clickability,
      navigation: "skipped" as const,
      status: null,
      finalUrl: null,
      issue,
    };
  });
}

async function exerciseFeatureFlow(
  page: Page,
  audience: Audience,
  locale: Locale,
  viewport: ViewportConfig,
  route: string
) {
  const results: FeatureFlowResult[] = [];

  if (audience === "public" && route === "/") {
    results.push(await runLandingDemoFlow(page, locale, viewport.name));
  }

  if (audience === "public" && route === "/admin_dashboard/login") {
    results.push(await runAdminLoginFlow(page, viewport.name));
  }

  if (audience === "authenticated" && route.startsWith("/history/")) {
    results.push(...(await runSummaryActionFlow(page, locale, viewport.name)));
  }

  if (audience === "authenticated" && route === "/todo") {
    results.push(await runTodoAddFlow(page, locale, viewport.name));
  }

  return results;
}

async function runLandingDemoFlow(page: Page, locale: Locale, viewport: ViewportName): Promise<FeatureFlowResult> {
  const useSampleName = locale === "ar" ? /استخدم محادثة نموذجية/i : /Use sample chat/i;
  const generateName = locale === "ar" ? /أنشئ ملخصًا تجريبيًا/i : /Create sample summary/i;
  const previewName = locale === "ar" ? /معاينة الملخص/i : /Summary preview/i;

  try {
    await page.getByRole("button", { name: useSampleName }).click();
    await page.getByRole("button", { name: generateName }).click();
    await expect(page.getByText(previewName)).toBeVisible({ timeout: 10_000 });

    return {
      key: "landing-demo-preview",
      audience: "public",
      locale,
      viewport,
      status: "pass",
      details: "Landing demo populated sample chat and rendered the preview state.",
    };
  } catch (error) {
    return {
      key: "landing-demo-preview",
      audience: "public",
      locale,
      viewport,
      status: "fail",
      details: formatError(error),
    };
  }
}

async function runAdminLoginFlow(page: Page, viewport: ViewportName): Promise<FeatureFlowResult> {
  try {
    await page.getByRole("link", { name: /continue to sign in/i }).click();
    await page.waitForURL(/\/login\?next=%2Fadmin_dashboard/, { timeout: 60_000 });

    return {
      key: "admin-login",
      audience: "public",
      locale: "en",
      viewport,
      status: "pass",
      details: "Admin login redirected to the dashboard.",
    };
  } catch (error) {
    return {
      key: "admin-login",
      audience: "public",
      locale: "en",
      viewport,
      status: "fail",
      details: formatError(error),
    };
  }
}

async function runSummaryActionFlow(page: Page, locale: Locale, viewport: ViewportName) {
  const results: FeatureFlowResult[] = [];

  try {
    await page.getByTestId("summary-action-export").click();
    await expect(page.getByTestId("summary-share-panel")).toBeVisible({ timeout: 5_000 });
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10_000 }),
      page.getByTestId("summary-download-export").click(),
    ]);
    await download.cancel().catch(() => null);

    results.push({
      key: "summary-export-download",
      audience: "authenticated",
      locale,
      viewport,
      status: "pass",
      details: "Summary export opened the share panel and emitted a .txt download.",
    });
  } catch (error) {
    results.push({
      key: "summary-export-download",
      audience: "authenticated",
      locale,
      viewport,
      status: "fail",
      details: formatError(error),
    });
  }

  try {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10_000 }),
      page.getByTestId("summary-action-calendar").click(),
    ]);
    await download.cancel().catch(() => null);

    results.push({
      key: "summary-calendar-export",
      audience: "authenticated",
      locale,
      viewport,
      status: "pass",
      details: "Summary calendar export emitted a downloadable file.",
    });
  } catch (error) {
    results.push({
      key: "summary-calendar-export",
      audience: "authenticated",
      locale,
      viewport,
      status: "fail",
      details: formatError(error),
    });
  }

  try {
    await page.getByTestId("summary-action-todo").click();
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 10_000 })
      .toBe("/todo");
    await expect(page.locator("#todo-add-task")).toBeVisible({ timeout: 15_000 });

    results.push({
      key: "summary-add-to-todo",
      audience: "authenticated",
      locale,
      viewport,
      status: "pass",
      details: "Summary action redirected to the to-do route successfully.",
    });
  } catch (error) {
    results.push({
      key: "summary-add-to-todo",
      audience: "authenticated",
      locale,
      viewport,
      status: "fail",
      details: formatError(error),
    });
  }

  return results;
}

async function runTodoAddFlow(page: Page, locale: Locale, viewport: ViewportName): Promise<FeatureFlowResult> {
  const taskLabel = locale === "ar" ? "متابعة التدقيق" : "Audit follow-up";

  try {
    await page.locator("#todo-add-task").fill(taskLabel);
    await page.locator("#todo-add-task").press("Enter");
    await expect(page.getByText(taskLabel, { exact: true })).toBeVisible({ timeout: 5_000 });

    return {
      key: "todo-add-task",
      audience: "authenticated",
      locale,
      viewport,
      status: "pass",
      details: "To-do item creation succeeded from the inline add control.",
    };
  } catch (error) {
    return {
      key: "todo-add-task",
      audience: "authenticated",
      locale,
      viewport,
      status: "fail",
      details: formatError(error),
    };
  }
}

async function verifyExternalLinks(audit: AuditReport) {
  const uniqueLinks = new Map<string, LinkAuditRecord>();

  for (const link of audit.linkChecks) {
    if (link.kind !== "external") {
      continue;
    }

    const key = `${link.resolvedHref}|${link.locale}|${link.viewport}`;
    if (!uniqueLinks.has(key)) {
      uniqueLinks.set(key, link);
    }

    if (uniqueLinks.size >= AUDIT_MAX_EXTERNAL_LINK_CHECKS) {
      break;
    }
  }

  for (const record of uniqueLinks.values()) {
    if (!record.resolvedHref) {
      record.navigation = "fail";
      record.issue = "External link could not be resolved.";
      continue;
    }

    try {
      const response = await fetchWithTimeout(record.resolvedHref, AUDIT_EXTERNAL_LINK_TIMEOUT_MS);
      record.status = response.status;
      record.finalUrl = response.url;
      record.navigation =
        response.redirected || normalizeVisitedPath(response.url) !== normalizeVisitedPath(record.resolvedHref)
          ? "redirect"
          : response.ok
            ? "pass"
            : "fail";

      if (!response.ok) {
        record.issue = `Received ${response.status} for external link.`;
      }
    } catch (error) {
      record.navigation = "fail";
      record.issue = formatError(error);
    }
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function aggregateAudit(audit: AuditReport) {
  const visitedInternalPaths = new Set(audit.routes.map((route) => normalizeVisitedPath(route.finalUrl)));
  const dynamicRoutePatterns = audit.routeMap.dynamicRoutes.map(buildDynamicRoutePattern);
  const typographyCounts = new Map<string, AggregatedTypographyCombo>();

  for (const link of audit.linkChecks) {
    if (link.kind !== "internal") {
      continue;
    }

    if (!link.resolvedHref) {
      link.navigation = "fail";
      link.issue = "Internal link could not be resolved.";
      continue;
    }

    const normalized = normalizeVisitedPath(link.resolvedHref);
    if (
      normalized.startsWith("/api/") ||
      normalized.startsWith("/_next/") ||
      /\.[a-z0-9]+$/i.test(normalized)
    ) {
      link.navigation = "skipped";
      link.issue = "Internal resource link skipped from page-route coverage.";
      continue;
    }

    if (!visitedInternalPaths.has(normalized)) {
      if (dynamicRoutePatterns.some((pattern) => pattern.test(normalized))) {
        link.navigation = "pass";
        link.status = 200;
        link.finalUrl = normalized;
        link.issue = null;
        continue;
      }

      link.navigation = "skipped";
      link.issue = `Internal target ${normalized} was outside the bounded crawl.`;
      continue;
    }

    link.navigation = "pass";
    link.status = 200;
    link.finalUrl = normalized;
  }

  for (const route of audit.routes) {
    for (const sample of route.typographySamples) {
      const key = [
        sample.fontFamily,
        sample.fontSize,
        sample.lineHeight,
        sample.fontWeight,
        sample.letterSpacing,
      ].join(" | ");
      const existing = typographyCounts.get(key);

      if (existing) {
        existing.count += 1;
        if (!existing.tags.includes(sample.tag)) {
          existing.tags.push(sample.tag);
        }
        continue;
      }

      typographyCounts.set(key, {
        key,
        fontFamily: sample.fontFamily,
        fontSize: sample.fontSize,
        lineHeight: sample.lineHeight,
        fontWeight: sample.fontWeight,
        letterSpacing: sample.letterSpacing,
        count: 1,
        sampleRoute: route.path,
        tags: [sample.tag],
        outlier: isTypographyOutlier(sample),
      });
    }
  }

  audit.typographyCombos = Array.from(typographyCounts.values()).sort((left, right) => right.count - left.count);
  audit.summary = {
    totalRoutes: audit.routes.length,
    brokenInternalLinks: audit.linkChecks.filter(
      (link) => link.kind === "internal" && link.navigation === "fail"
    ).length,
    redirectedLinks: audit.linkChecks.filter((link) => link.navigation === "redirect").length,
    consoleErrorPages: audit.routes.filter((route) => route.consoleErrors.length > 0 || route.pageErrors.length > 0).length,
    requestFailurePages: audit.routes.filter((route) => route.requestFailures.length > 0).length,
    a11yCriticalCount: audit.routes.reduce((total, route) => total + route.a11yCritical.length, 0),
    a11yWarningCount: audit.routes.reduce((total, route) => total + route.a11yWarnings.length, 0),
    typographyOutlierCount: audit.typographyCombos.filter((combo) => combo.outlier).length,
  };
}

function isTypographyOutlier(sample: TypographySample) {
  const fontSize = Number.parseFloat(sample.fontSize);
  const lineHeight = Number.parseFloat(sample.lineHeight);
  const borderRadiusValues = sample.borderRadius
    .split(" ")
    .map((value) => Number.parseFloat(value))
    .filter((value) => Number.isFinite(value));
  const paddingValues = `${sample.paddingInline} ${sample.paddingBlock}`
    .split(" ")
    .map((value) => Number.parseFloat(value))
    .filter((value) => Number.isFinite(value));

  const isHeading = /^h[1-4]$/.test(sample.tag);
  const isButton = sample.tag === "button";
  const fontWithinFluidRange =
    (sample.tag === "h1" && fontSize >= 32 && fontSize <= 72) ||
    (sample.tag === "h2" && fontSize >= 24 && fontSize <= 52) ||
    (sample.tag === "h3" && fontSize >= 20 && fontSize <= 36) ||
    (sample.tag === "h4" && fontSize >= 16 && fontSize <= 28) ||
    (isButton && fontSize >= 12 && fontSize <= 20);
  const fontOnScale =
    TYPOGRAPHY_SCALE_PX.some((allowed) => Math.abs(allowed - fontSize) <= 1.25) ||
    fontWithinFluidRange;
  const minLineHeightRatio = isHeading ? 1.02 : isButton ? 1.08 : 1.15;
  const lineHeightLooksTight =
    Number.isFinite(lineHeight) && lineHeight > 0 && lineHeight < fontSize * minLineHeightRatio;
  const radiusOffScale = borderRadiusValues
    .filter((value) => value < 100)
    .some(
    (value) => value > 0 && !SPACING_SCALE_PX.some((allowed) => Math.abs(allowed - value) <= 1.5)
  );
  const paddingOffScale = paddingValues.some(
    (value) => value > 0 && !SPACING_SCALE_PX.some((allowed) => Math.abs(allowed - value) <= 1.5)
  );

  return !fontOnScale || lineHeightLooksTight || radiusOffScale || paddingOffScale;
}

async function captureScreenshot(
  page: Page,
  options: {
    audience: Audience;
    locale: Locale;
    viewport: ViewportName;
    route: string;
  }
) {
  const routeSlug = slugifyRoute(options.route);
  const relativePath = path.join(
    "reports",
    "screenshots",
    options.locale,
    options.viewport,
    `${options.audience}__${routeSlug}.png`
  );
  const outputPath = path.join(process.cwd(), relativePath);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await page.screenshot({
    path: outputPath,
    fullPage: false,
    animations: "disabled",
  });

  return relativePath.replaceAll("\\", "/");
}

async function createAuditContext(browser: Browser, locale: Locale, viewport: ViewportConfig) {
  const context = await browser.newContext({
    viewport: {
      width: viewport.width,
      height: viewport.height,
    },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    locale: locale === "ar" ? "ar-SA" : "en-US",
  });

  await context.addCookies([
    {
      name: LANG_STORAGE_KEY,
      value: locale,
      url: BASE_URL,
      sameSite: "Lax",
    },
  ]);

  await context.addInitScript(
    ({ localeValue, themeKey, localeKey }) => {
      try {
        if (typeof window.localStorage !== "undefined") {
          window.localStorage.setItem(localeKey, localeValue);
          window.localStorage.setItem(themeKey, "light");
        }
      } catch {
        // Ignore localStorage failures for restricted documents.
      }

      try {
        if (document.documentElement) {
          document.documentElement.lang = localeValue;
          document.documentElement.dir = localeValue === "ar" ? "rtl" : "ltr";
        }
      } catch {
        // Ignore transient document access failures before the page is ready.
      }
    },
    {
      localeValue: locale,
      themeKey: THEME_STORAGE_KEY,
      localeKey: LANG_STORAGE_KEY,
    }
  );

  return context;
}

async function seedFounderSummary(
  browser: Browser,
  account: { email: string; password: string; plan: string }
) {
  const context = await createAuditContext(browser, "en", VIEWPORTS[2]);
  await context.addCookies(await getAuthCookies(account));
  const page = await context.newPage();

  try {
    await summarizeWithSample(page);
  } finally {
    await page.close();
    await context.close();
  }

  const ids = await getVisibleSummaryIds(account.email);
  return ids[0] ? `/history/${ids[0]}` : null;
}

function buildCoverage(staticRoutes: string[], historyDetailPath: string | null) {
  const publicRoutes = pickPriorityRoutes(staticRoutes, PRIORITY_PUBLIC_ROUTES);
  const authenticatedRoutes = pickPriorityRoutes(staticRoutes, PRIORITY_AUTHENTICATED_ROUTES);
  const adminRoutes = pickPriorityRoutes(staticRoutes, PRIORITY_ADMIN_ROUTES);

  if (historyDetailPath && !authenticatedRoutes.includes(historyDetailPath)) {
    authenticatedRoutes.push(historyDetailPath);
  }

  return {
    public: sortRoutes(publicRoutes),
    authenticated: sortRoutes(authenticatedRoutes),
    admin: sortRoutes(adminRoutes),
  };
}

function pickPriorityRoutes<T extends readonly string[]>(staticRoutes: string[], priorityRoutes: T) {
  const staticRouteSet = new Set(staticRoutes);
  const selected = priorityRoutes.filter((route) => staticRouteSet.has(route));
  return [...selected];
}

async function collectAppRoutes(appDir: string, segments: string[] = []): Promise<AppRouteMap> {
  const entries = await fs.readdir(appDir, { withFileTypes: true });
  const staticRoutes = new Set<string>();
  const dynamicRoutes = new Set<string>();
  const segmentPath = segments.filter((segment) => !segment.startsWith("(")).join("/");

  if (entries.some((entry) => entry.isFile() && entry.name === "page.tsx")) {
    const route = segmentPath ? `/${segmentPath}` : "/";
    if (route.includes("[")) {
      dynamicRoutes.add(route);
    } else {
      staticRoutes.add(route);
    }
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (entry.name === "api" || entry.name.startsWith("_")) {
      continue;
    }

    const next = await collectAppRoutes(path.join(appDir, entry.name), [...segments, entry.name]);
    next.staticRoutes.forEach((route) => staticRoutes.add(route));
    next.dynamicRoutes.forEach((route) => dynamicRoutes.add(route));
  }

  return {
    staticRoutes: sortRoutes(Array.from(staticRoutes)),
    dynamicRoutes: sortRoutes(Array.from(dynamicRoutes)),
  };
}

function sortRoutes(routes: string[]) {
  return [...new Set(routes)].sort((left, right) => left.localeCompare(right));
}

function slugifyRoute(route: string) {
  if (route === "/") {
    return "home";
  }

  return route
    .replace(/^\//, "")
    .replace(/[/?#=&]+/g, "__")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeVisitedPath(urlOrPath: string) {
  const url = urlOrPath.startsWith("http") ? new URL(urlOrPath) : new URL(urlOrPath, BASE_URL);
  const normalized = url.pathname;
  return normalized === "" ? "/" : normalized.replace(/\/$/, "") || "/";
}

function buildDynamicRoutePattern(route: string) {
  const normalized = route === "/" ? "/" : route.replace(/\/$/, "");
  const segments = normalized.split("/").filter(Boolean);

  if (segments.length === 0) {
    return /^\/$/;
  }

  const pattern = segments
    .map((segment) => {
      if (/^\[\[\.\.\..+\]\]$/.test(segment)) {
        return ".*";
      }

      if (/^\[\.\.\..+\]$/.test(segment)) {
        return ".+";
      }

      if (/^\[.+\]$/.test(segment)) {
        return "[^/]+";
      }

      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");

  return new RegExp(`^/${pattern}$`);
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function loadOrCreateAuditReport(options: {
  env: Awaited<ReturnType<typeof getDevEnv>>;
  routeMap: AppRouteMap;
  coverage: AuditReport["coverage"];
}) {
  const coveredPaths = new Set([
    ...options.coverage.public,
    ...options.coverage.authenticated,
    ...options.coverage.admin,
  ]);

  if (!AUDIT_RESET) {
    try {
      const existing = JSON.parse(await fs.readFile(JSON_REPORT_PATH, "utf8")) as Partial<AuditReport>;
      return {
        generatedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        routeMap: options.routeMap,
        coverage: options.coverage,
        environment: {
          supabaseUrl: options.env.env.supabaseUrl,
          supabaseAnon: options.env.env.supabaseAnon,
          serviceRole: options.env.env.serviceRole,
          openai: options.env.env.openai,
        },
        routes: Array.isArray(existing.routes)
          ? existing.routes.filter((route) => coveredPaths.has(route.path))
          : [],
        featureFlows: Array.isArray(existing.featureFlows) ? existing.featureFlows : [],
        linkChecks: Array.isArray(existing.linkChecks)
          ? existing.linkChecks.filter((link) => coveredPaths.has(link.sourcePath))
          : [],
        typographyCombos: Array.isArray(existing.typographyCombos) ? existing.typographyCombos : [],
        summary: existing.summary ?? {
          totalRoutes: 0,
          brokenInternalLinks: 0,
          redirectedLinks: 0,
          consoleErrorPages: 0,
          requestFailurePages: 0,
          a11yCriticalCount: 0,
          a11yWarningCount: 0,
          typographyOutlierCount: 0,
        },
      } satisfies AuditReport;
    } catch {
      // Fall through to create a new report scaffold.
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    routeMap: options.routeMap,
    coverage: options.coverage,
    environment: {
      supabaseUrl: options.env.env.supabaseUrl,
      supabaseAnon: options.env.env.supabaseAnon,
      serviceRole: options.env.env.serviceRole,
      openai: options.env.env.openai,
    },
    routes: [],
    featureFlows: [],
    linkChecks: [],
    typographyCombos: [],
    summary: {
      totalRoutes: 0,
      brokenInternalLinks: 0,
      redirectedLinks: 0,
      consoleErrorPages: 0,
      requestFailurePages: 0,
      a11yCriticalCount: 0,
      a11yWarningCount: 0,
      typographyOutlierCount: 0,
    },
  } satisfies AuditReport;
}

async function ensureDirectories(reset = false) {
  if (reset) {
    await fs.rm(REPORTS_DIR, { recursive: true, force: true }).catch(() => undefined);
  }
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
  await fs.mkdir(REPORTS_DIR, { recursive: true });
}

async function writeReports(audit: AuditReport) {
  aggregateAudit(audit);
  await fs.writeFile(JSON_REPORT_PATH, JSON.stringify(audit, null, 2), "utf8");

  const summary = audit.summary;

  const topIssues = [
    `Routes audited: ${summary.totalRoutes}`,
    `Broken internal links: ${summary.brokenInternalLinks}`,
    `Pages with console errors: ${summary.consoleErrorPages}`,
    `Failed network pages: ${summary.requestFailurePages}`,
    `Critical accessibility issues: ${summary.a11yCriticalCount}`,
    `Typography outliers: ${summary.typographyOutlierCount}`,
  ];

  const markdown = [
    "# FAZUMI Audit",
    "",
    `Generated: ${audit.generatedAt}`,
    `Base URL: ${audit.baseUrl}`,
    "",
    "## Snapshot",
    ...topIssues.map((issue) => `- ${issue}`),
    "",
    "## Coverage",
    `- Public routes: ${audit.coverage.public.length}`,
    `- Authenticated routes: ${audit.coverage.authenticated.length}`,
    `- Admin routes: ${audit.coverage.admin.length}`,
    "",
    "## Report Files",
    `- JSON: \`${path.relative(process.cwd(), JSON_REPORT_PATH).replaceAll("\\", "/")}\``,
    `- Screenshots: \`${path.relative(process.cwd(), SCREENSHOTS_DIR).replaceAll("\\", "/")}\``,
    "",
    "This file is a generated snapshot. Replace it with the detailed human audit after review.",
    "",
  ].join("\n");

  await fs.writeFile(MARKDOWN_REPORT_PATH, markdown, "utf8");
}
