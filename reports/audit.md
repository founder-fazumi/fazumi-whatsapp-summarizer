# FAZUMI MVP Audit Report

Generated: 2026-03-04T14:34:18.711Z  
Base URL: `http://127.0.0.1:3000`

## Executive Summary

FAZUMI is a `Next.js 15` App Router app on `React 18`, styled with `Tailwind CSS v4` plus CSS custom-property tokens in `app/globals.css`. Localization is custom, centered on `lib/i18n.ts` with `LangContext`, and the reusable UI layer lives in `components/ui`.

The audit covered `168` route/locale/viewport combinations across public, authenticated, and admin surfaces. The final passing run produced:

- `0` broken internal links
- `0` console-error pages
- `0` request-failure pages
- `0` critical accessibility findings
- `0` accessibility warnings
- `26` remaining typography outlier combos, concentrated in secondary metadata text rather than primary headings/body copy

### Top 10 Issues Found

| # | Issue | Status | Evidence / Fix |
| --- | --- | --- | --- |
| 1 | Summary -> To-Do failed when `public.user_todos` was missing from the anon REST schema cache. | Fixed | `/api/health` now checks anon REST accessibility and the UI falls back to local to-dos instead of broken remote writes. |
| 2 | Split Playwright audit runs produced truthful route data but stale `summary` and `typographyCombos` output. | Fixed | `tests/playwright/audit.spec.ts` now aggregates before every report write. |
| 3 | Query-string links like `/login?tab=signup` were counted as broken internal routes. | Fixed | Internal link normalization now resolves page coverage by pathname and skips internal resource URLs such as `/api/*`. |
| 4 | Hydration mismatch appeared on landing textarea elements due injected/empty inline styles. | Fixed | `public/hydration-sanitize.js` now strips transient `style` attributes and `caret-color` noise before hydration. |
| 5 | Several pages were missing a `<main>` landmark or proper `<h1>`. | Fixed | Landmark and heading fixes applied across login, offline, billing, calendar, profile, todo, settings, and history detail pages. |
| 6 | Some textareas, search fields, and icon-only buttons lacked accessible names. | Fixed | Added labels/`aria-label`s to hero demo, summarize textarea, history/admin searches, and summary feedback actions. |
| 7 | Arabic billing/pricing copy mixed English plan names and inconsistent founder terminology. | Fixed | Normalized plan naming across billing, pricing, teaser, refunds, and navigation. |
| 8 | Radius, padding, and typography tokens were drifting away from a coherent system. | Fixed | Standardized core tokens in `app/globals.css`, including fonts, spacing, radii, shadows, and page rhythm. |
| 9 | Full audit runs previously failed with noisy request aborts and dev-only route churn. | Fixed | The audit now ignores expected `ERR_ABORTED` SPA transitions and completes cleanly in one full pass. |
| 10 | LinkedIn company link resolves to a `404`. | Remaining | External link verification still shows `https://linkedin.com/company/fazumi` -> `https://www.linkedin.com/company/fazumi` with `404`. |

## Coverage

### Routes Audited

Public routes:

- `/`
- `/about`
- `/admin_dashboard/login`
- `/contact`
- `/cookie-policy`
- `/faq`
- `/help`
- `/login`
- `/offline`
- `/pricing`
- `/privacy`
- `/refunds`
- `/status`
- `/terms`

Authenticated routes:

- `/billing`
- `/calendar`
- `/dashboard`
- `/history`
- `/history/[seeded-summary-id]`
- `/profile`
- `/settings`
- `/summarize`
- `/todo`

Admin routes:

- `/admin_dashboard`
- `/admin_dashboard/ai-usage`
- `/admin_dashboard/feedback`
- `/admin_dashboard/income`
- `/admin_dashboard/users`

Viewport and locale matrix:

- Mobile: `390x844`
- Tablet: `768x1024`
- Desktop: `1440x900`
- Locales: English (`en`) and Arabic (`ar`)

### Feature Flows Exercised

- Landing demo sample preview: pass on `en/mobile`, `ar/mobile`, `en/tablet`, `en/desktop`
- Admin login: pass on `en/desktop`
- Summary export `.txt`: pass on authenticated `en/ar` for mobile and desktop
- Summary calendar export `.ics`: pass on authenticated `en/ar` for mobile and desktop
- Summary “Add to To-Do”: pass on authenticated `en/ar` for mobile and desktop
- To-do inline creation: pass on authenticated `en/ar` for mobile and desktop

### Evidence

Representative screenshots:

- `reports/screenshots/en/mobile/public__home.png`
- `reports/screenshots/ar/mobile/public__home.png`
- `reports/screenshots/en/desktop/authenticated__history__adce458e-7ad4-4d1c-a5ff-50eb0a00aa1a.png`
- `reports/screenshots/ar/desktop/authenticated__billing.png`

Baseline failure evidence captured during the audit and then fixed:

```text
admin/ar/tablet/admin_dashboard/users: console errors detected
Broken internal links: 150
Pages with console errors: 2
Pages with failed network requests: 3
```

Final passing evidence:

```text
1 passed (15.2m)
Routes audited: 168
Broken internal links: 0
Pages with console errors: 0
Failed network pages: 0
Critical accessibility issues: 0
Typography outliers: 26
```

## Link Check Results

### Internal Links

- Result: `0` broken internal links
- Internal page links now normalize query-driven variants like `/login?tab=signup` to the covered page route.
- Internal resource link `/api/health` is intentionally skipped from page-route coverage rather than reported as broken.

### External Links

Unique external destinations audited:

| URL in UI | Final URL | Result |
| --- | --- | --- |
| `https://facebook.com/fazumi` | `https://www.facebook.com/fazumi` | Redirect, `200` |
| `https://instagram.com/fazumi` | `https://www.instagram.com/fazumi` | Redirect, `200` |
| `https://twitter.com/fazumi` | `https://x.com/fazumi` | Redirect, `200` |
| `https://youtube.com/@fazumi` | `https://www.youtube.com/@fazumi` | Redirect, `200` |
| `https://linkedin.com/company/fazumi` | `https://www.linkedin.com/company/fazumi` | Redirect, `404` |

Assessment:

- No broken internal navigation remains.
- Social URLs are mostly valid but canonicalize.
- The LinkedIn company URL is still broken and should either be replaced with the correct destination or hidden until a real page exists.

## Functional QA Results By Feature

### Public Surface

- Landing hero sample flow works in EN and AR.
- Legal/help/contact/pricing routes load across mobile, tablet, and desktop without console or request errors.
- Admin login page is reachable in both locales; the credential flow was exercised successfully on desktop EN.

### Authenticated Surface

- Dashboard, billing, calendar, summarize, todo, history, settings, and profile all render in EN/AR and all three viewports.
- Summary export produces downloadable `.txt` output.
- Calendar export produces downloadable calendar files.
- “Add to To-Do” now lands on `/todo` successfully instead of failing against a broken Supabase REST path.
- To-do inline entry works after redirect and in direct route access.

### Admin Surface

- Overview, AI usage, feedback, income, and users routes all passed in EN/AR on mobile, tablet, and desktop.
- Search fields in feedback and users tables now expose labels and accessible names.

## Copy Review Findings

### English

Fixed:

- Normalized founder terminology from inconsistent “Founder LTD” phrasing to “Founder lifetime” or “Founder Lifetime” where appropriate.
- Removed end-user-facing “webhook” jargon from billing fallback copy.
- Tightened subscription labels so pricing, billing, and refunds speak the same language.

Remaining:

- Third-party proper nouns such as `Lemon Squeezy` and `PostHog` remain in English intentionally.

### Arabic

Fixed:

- Replaced mixed-language labels such as `Pro شهري` / `Pro سنوي` with `برو الشهري` / `برو السنوي`.
- Unified founder naming to `باقة المؤسسين` or `باقة المؤسسين مدى الحياة`.
- Unified navigation billing label to `الفوترة`.
- Rewrote copy into more neutral MSA tone for billing and refunds.

Remaining:

- Some brand/product names remain transliterated or untranslated by design: `Fazumi`, `Lemon Squeezy`, `PostHog`.

## RTL Findings

- `html[lang]` and `html[dir]` are correct for EN/AR across the audited routes.
- Arabic renders with `Alexandria`, which matches the minimal tone better than the prior generic handling.
- Primary mobile and desktop Arabic screens maintain right-aligned hierarchy and correct section order.
- Button/icon directionality is correct on major actions after the token/layout refactor.
- Number rendering stays intentionally Latin via `lib/format.ts`, which keeps dates, prices, and counts consistent between locales.
- Saved summaries keep their original content language inside an Arabic UI. This is expected and signaled with an `EN` badge on the history detail view.

## Typography Audit

### System Discovered

- Latin font: `Manrope`
- Arabic font: `Alexandria`
- Core type tokens live in `app/globals.css`
- Core size ladder: `12 / 14 / 16 / 17(ar) / 18 / 20 / 24 / 32 / 40 / 48 / 56 / 64 / 72`
- Line-height tokens: `1 / 1.1 / 1.25 / 1.55 / 1.7 / 1.85`

### Result

- Primary hierarchy is coherent after the refactor: landing hero, page headers, cards, and CTA controls now read as one system rather than unrelated Tailwind utilities.
- The final audit records `26` unique typography outlier combos across `213` unique computed-style combos.
- Remaining outliers are concentrated on secondary metadata and utility text, not the main content hierarchy.

Most concentrated outlier routes:

- `/history/[seeded-summary-id]`
- `/billing`
- `/calendar`
- `/about`
- `/login`

What is still non-proportional:

- Repeated `10px` micro-label text in metadata/UI chrome
- A few dense textarea/input line-heights on landing and summarize surfaces
- Some route-specific metadata rows using bespoke font/padding mixes

## Visual System Audit

### What Changed

- Added/standardized tokens for typography, spacing, radius, shadow, page width, and surface elevation in `app/globals.css`.
- Preserved FAZUMI brand colors and only extended with neutrals, opacity variants, and shadow/elevation tokens.
- Moved rounding toward a cleaner system: `12 / 16 / 24 / 32`.
- Tightened card rhythm with calmer page gutters, softer borders, and more consistent content padding.
- Retained premium minimal gradients and backdrop treatment without changing brand palette.

### Result

- Mobile is the strongest surface and now feels intentionally spaced rather than compressed.
- Tablet and desktop no longer blow headings out of proportion because global heading selectors were lowered in specificity.
- Buttons, cards, and panels have more consistent padding and elevation.
- Focus rings are present on core controls via the shared `components/ui` layer (`button`, `input`, `textarea`, `tabs`).

## Accessibility Snapshot

Automated checks:

- DOM-based landmark/heading/label audit built into `tests/playwright/audit.spec.ts`
- Playwright ARIA snapshot call (`locator('body').ariaSnapshot()`) integrated into the route audit
- Final result: `0` critical findings, `0` warnings

Manual spot checks:

- Landmark structure is now present on the previously missing pages.
- Search fields and icon-only controls now expose accessible names.
- Focusable controls on landing, settings, summarize, history detail, and todo follow a sane order on mobile.
- Contrast on primary CTA green, muted text, and surface borders is acceptable within FAZUMI’s palette constraints.

## Performance Notes

- Full end-to-end audit pass completes in about `15.2 minutes` under the current local dev server with screenshots enabled for all route/locale/viewport combinations.
- The audit is heavy because it captures `168` screenshots and runs feature flows in both locales.
- The earlier dev-only hydration mismatch and stale service worker/cache behavior were addressed by the hydration sanitize script plus layout bootstrapping cleanup.
- No obvious runtime console or request failures remain on the audited paths.

## Fix Plan Mapping

| Audit finding | PR change | Key files |
| --- | --- | --- |
| Broken summary -> todo path when remote todo storage is unavailable | Added REST-aware health detection and local to-do fallback usage | `app/api/health/route.ts`, `lib/feature-health.ts`, `lib/todos/local.ts`, `components/SummaryDisplay.tsx`, `components/widgets/TodoList.tsx`, `components/widgets/TodoWidget.tsx` |
| Split audit runs leaving stale reports | Always aggregate before report writes | `tests/playwright/audit.spec.ts` |
| Query-string sign-up links flagged as broken | Normalize internal paths by pathname and skip internal resources from page-route coverage | `tests/playwright/audit.spec.ts` |
| Hydration mismatch from transient inline styles | Strip empty/transient textarea/input styles before hydration | `public/hydration-sanitize.js` |
| Missing H1/main landmarks | Upgraded page titles/containers to semantic landmarks and H1s | `app/login/page.tsx`, `app/offline/page.tsx`, `app/billing/page.tsx`, `app/calendar/page.tsx`, `app/profile/page.tsx`, `app/todo/page.tsx`, `app/history/[id]/page.tsx`, `components/settings/SettingsPanel.tsx`, `app/admin_dashboard/login/page.tsx` |
| Missing field/button labels | Added labels and `aria-label`s for textareas, search fields, and feedback buttons | `components/landing/Hero.tsx`, `app/summarize/page.tsx`, `components/history/HistoryList.tsx`, `components/admin/FeedbackTable.tsx`, `components/admin/AdminUsersTable.tsx`, `components/SummaryDisplay.tsx` |
| Typography/rhythm inconsistency | Added tokenized fonts, spacing, radii, shadows, and lower-specificity heading rules | `app/globals.css`, `app/layout.tsx` |
| Arabic billing/pricing inconsistency | Cleaned copy and unified terminology | `lib/i18n.ts`, `app/billing/page.tsx`, `components/landing/Pricing.tsx`, `components/landing/CheckoutTeaser.tsx`, `app/refunds/page.tsx` |

## Remaining Known Issues

1. `https://linkedin.com/company/fazumi` still resolves to a `404`. The product should either point to the correct public company page or suppress the link until that page exists.
2. The typography audit still flags `26` unique secondary-style combinations, mostly from `10px` metadata labels and dense utility text on billing/calendar/history detail. They do not break flows, but they are the main remaining polish gap if the goal is a stricter `12px+` minimum micro-type system.
