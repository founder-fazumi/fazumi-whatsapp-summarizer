# Fazumi — Lessons Log

> Format for every entry:
> **Mistake** → What went wrong
> **Why** → Root cause
> **Rule** → The rule to follow going forward
> **Quick test** → How to verify the rule is being followed

---

## L005 — Next.js ESLint lints archived CommonJS service code
**Mistake:** Running `pnpm lint` on the Next.js app also linted `services/wa-bot/src/*.js` (CommonJS require() style), causing 17 errors.
**Why:** `eslint.config.mjs` has no explicit ignore for `services/`. The default Next.js ESLint config lints all JS/TS files in the project root recursively.
**Rule:** Whenever archiving non-Next.js code under the repo root, immediately add the folder to `globalIgnores` in `eslint.config.mjs`. Pattern: `"services/**"`.
**Quick test:** `pnpm lint` must complete with zero errors when only `services/**` exists alongside Next.js code.

---

## L001 — WA Bot on Free Render tier causes cold-start webhook failures
**Mistake:** WhatsApp (360dialog) webhooks failed to ACK within timeout when Render free tier went to sleep.
**Why:** Render free plan sleeps after 15min of inactivity. WhatsApp expects HTTP 200 within ~5 seconds.
**Rule:** Never run a production webhook receiver on a sleep-capable free tier. Use always-on hosting (Vercel serverless, Supabase Edge Functions, Cloud Run min-instances=1) for any inbound webhook endpoint.
**Quick test:** After 20+ minutes of no traffic, send a test webhook and verify HTTP 200 is returned within 3 seconds.

---

## L002 — Storing raw user text is both a legal and performance risk
**Mistake:** (Pre-emptive) The WA bot encrypts and stores raw message text (text_enc). While encrypted, this creates a data liability.
**Why:** Storing raw chat creates GDPR "data minimization" issues and increases breach impact if decryption key is compromised.
**Rule:** The web app NEVER stores raw pasted text or uploaded file contents. Process in memory → store only the structured summary output. Enforced in API route code.
**Quick test:** After a summary, query `summaries` table — confirm no column contains raw chat text.

---

## L003 — Paywall check must happen BEFORE AI call
**Mistake:** (From WA bot design lessons) If you call OpenAI before checking the paywall, you burn tokens for users who are over-limit.
**Why:** AI API calls cost money. Users over their limit should get a gate, not a summary.
**Rule:** In `app/api/summarize/route.ts`, the FIRST operation after input validation is the limit check (`lib/limits.ts`). OpenAI is only called if the limit check passes.
**Quick test:** Set a user to 0 remaining summaries → hit the summarize endpoint → confirm 403 returned without any OpenAI call (check server logs for no OpenAI request).

---

## L004 — Usage counter must increment ONLY after successful response
**Mistake:** (From WA bot design) If you increment usage before confirming the response was delivered, failed responses count against the user.
**Why:** Network errors, OpenAI timeouts, or response serialization failures can cause a "charge but no delivery" scenario.
**Rule:** In the API route, increment `summaries_today` and `summaries_month` ONLY after the summary is returned successfully (inside a try/finally or after the response is confirmed).
**Quick test:** Force an OpenAI error mid-request → verify user's counter did not increment.

---

## L007 — Senior review loop: never commit mixed unknown changes without diff audit
**Mistake:** Codex submitted 43 changed files in one batch without committing. Senior dev had to audit all of them at once, making it hard to isolate issues.
**Why:** Junior dev implemented too many changes across too many files in one session without intermediate commits. Some changes were correct, others had residual issues (fake card form, wrong refund period).
**Rule:** Junior (Codex) must commit after each chunk/story (not after completing all stories). Each commit must be scoped to one logical change. Senior review loop must be run per-chunk, not per-session.
**Quick test:** `git log --oneline` should show one commit per feature chunk, not one commit per session.

---

## L008 — Wrong refund period in copy: must match CLAUDE.md pricing section exactly
**Mistake:** Codex used "14-day money-back guarantee" in Pricing.tsx and CheckoutTeaser.tsx. Actual policy is 7-day per CLAUDE.md.
**Why:** Copy was inherited from earlier placeholders without cross-referencing the spec.
**Rule:** Before writing any refund/guarantee/pricing copy, always read CLAUDE.md "Pricing & Limits" section. The canonical numbers are: 7-day money-back for monthly+annual; no refund for Founder.
**Quick test:** `grep -r "14-day\|14 day" components/ app/` must return zero results.

---

## L006 — Use local skills to standardize FE/BE/UI work and reduce rework
**Mistake:** (Pre-emptive) Repeating the same implementation decisions across sessions without a shared reference — wrong Supabase client, missing RLS, inconsistent CSS var usage, vague microcopy.
**Why:** Without written standards, each session risks diverging from established patterns, causing rework and bugs.
**Rule:** Invoke the relevant skill before implementing: `/frontend-dev` for UI/pages, `/backend-dev` for API/DB/auth, `/ui-ux` for conversion and copy decisions. Skills live in `.claude/skills/<name>/SKILL.md`. Update them when a new pattern is confirmed.
**Quick test:** Open the skill file and verify the decision you're about to make is covered. If not, add it to the skill after implementation.

---

## L009 — Client preference state must hydrate from a server-safe snapshot
**Mistake:** Theme and language were read from `localStorage` during the first render of client components, so React hydrated with client-only values that did not match the server HTML.
**Why:** `localStorage` is only available in the browser, but those values were still influencing the initial render path for SSR-hydrated UI like header toggles and localized labels.
**Rule:** For persisted client preferences that affect SSR-visible markup, hydrate from a server-safe default first and then switch to the stored browser snapshot with `useSyncExternalStore` or an equivalent hydration-safe pattern.
**Quick test:** Set `fazumi_theme=dark` and `fazumi_lang=ar` in `localStorage`, refresh `/`, and confirm there is no hydration mismatch overlay in Next dev.

---

## L010 — Never swallow persistence failures in the summarize loop
**Mistake:** The summarize API returned success even when saving to `summaries` or updating `usage_daily` failed, which broke `/history` and made limits drift from reality.
**Why:** Persistence helpers returned `null` or silently ignored write errors, so the UI could not distinguish "summary generated" from "summary saved and counted."
**Rule:** In the summarize loop, storage and usage writes must either succeed or surface a real server error. If a summary cannot be saved, do not pretend the loop completed.
**Quick test:** Temporarily break the service-role config, hit `/api/summarize`, and confirm the response is `500` with a save/usage error instead of `200`.

---

## L011 — OAuth entry and callback must preserve the intended destination
**Mistake:** Provider auth was started with a bare `/auth/callback` URL, so the flow dropped the original `next` destination and depended on the browser redirect side effect from `signInWithOAuth`.
**Why:** The login page did not thread `next` through OAuth/email callback URLs, and the callback route did not normalize the return destination or forwarded host before redirecting back into the app.
**Rule:** Any auth flow that leaves the app must build a callback URL that carries a sanitized relative `next` path, and the callback route must redirect back using that same sanitized path.
**Quick test:** Open `/login?next=/summarize`, continue with Google or Apple, and confirm the callback returns to `/summarize` instead of a generic dashboard/login loop.

---

## L012 — `app/global-error.tsx` must stay hook-free in Next.js App Router
**Mistake:** The global error boundary used normal client-component patterns (`useEffect` plus shared error UI), which pulled in hook-dependent behavior and caused the production build to fail during route generation.
**Why:** `app/global-error.tsx` is a special App Router boundary with stricter constraints than a typical client component.
**Rule:** Keep `app/global-error.tsx` self-contained: no React hooks, no context imports, no hook-dependent shared components. Prefer plain markup with inline styles.
**Quick test:** Run `pnpm build` and confirm there is no `Cannot read properties of null (reading 'useContext')` crash during static page generation.

---

## L013 — Localized list data must be normalized before SSR list rendering
**Mistake:** Public pages were calling `.length` and `.map` directly on the result of `pick(section.items, locale)`, which assumes every localized branch always resolves to a concrete array during prerender.
**Why:** SSR failures on legal/help pages become brittle when localized collection data is ever missing, malformed, or widened to `undefined` by future edits.
**Rule:** When rendering localized collections, coerce the selected value to a concrete fallback first, for example `const items = pick<readonly string[] | undefined>(section.items, locale) ?? [];`, and only then call `.length` or `.map`.
**Quick test:** Temporarily set one localized `items` branch to `undefined`, run `pnpm build`, and confirm the page still prerenders without a `Cannot read properties of undefined (reading 'length')` crash.

---

## L014 — `app/error.tsx` must not pull provider-dependent UI into route fallback rendering
**Mistake:** The route-level App Router boundary imported a shared `ErrorFallback` component that depends on `useLang()`, which caused the production build to crash with `Cannot read properties of null (reading 'useContext')`.
**Why:** `app/error.tsx` runs in a restricted boundary path where transitive provider hooks are not guaranteed to exist during prerender or recovery.
**Rule:** Keep `app/error.tsx` self-contained: no shared fallback components, no provider hooks, and no imports from `@/lib/context/*`.
**Quick test:** `Get-Content app/error.tsx | Select-String "ErrorFallback|useLang|useTheme|@/lib/context"` returns no matches, and `pnpm build` finishes without the `useContext` prerender crash.

---

## L015 — Prove framework regressions with a version pin before patching app code
**Mistake:** It is easy to keep treating a framework regression like an app bug and spend time on route-level workarounds even after the stack trace has moved into Next.js internals.
**Why:** Repro steps and error text can look app-adjacent while the real fix is a runtime change, especially around App Router metadata and prerender internals.
**Rule:** When a build failure points into framework internals, verify the current package version, pin to the known-good framework release first, clear caches, and rerun the production build before adding app-side suppressions.
**Quick test:** After pinning the framework version and clearing `.next` plus `node_modules/.cache`, run `pnpm build` and confirm the original internal-error signature is gone before touching route/page code again.

---

## L016 — Operator auth must fail closed unless its own credentials are explicitly set
**Mistake:** The local admin dashboard enabled itself whenever the Supabase admin env vars existed and silently fell back to default credentials.
**Why:** The gate treated unrelated service-role configuration as proof that operator auth was ready, and convenience defaults were left in the auth path.
**Rule:** Any operator-only surface must require its own explicit credentials or secret values and must return `404`/unauthorized when they are missing. Never derive operator access from unrelated infrastructure env vars alone.
**Quick test:** Remove `ADMIN_USERNAME` or `ADMIN_PASSWORD`, load `/admin_dashboard`, and confirm the page returns `404` and `POST /api/admin/login` returns `404`.

---

## L017 — Billing mirrors must never outrank authoritative subscription state
**Mistake:** Summarize limits and paid gating drifted because `profiles.plan` and stale order rows could still look paid after Lemon Squeezy had moved the real subscription to `past_due`, `cancelled`, or `expired`.
**Why:** The code mixed a mirrored profile field with live subscription state and did not distinguish recurring subscription rows from one-time order seed rows.
**Rule:** Resolve entitlements from one shared subscription-aware helper. Treat `profiles.plan` as a fail-safe mirror only, and ignore order-only rows whenever recurring subscription rows exist for the same user.
**Quick test:** Seed an active order row plus a later `past_due` subscription row for the same paid plan and confirm the resolver returns no paid access.

---

## L018 — Locale smoke tests must start from a clean browser state
**Mistake:** Public-route tests assumed a default locale without clearing the cookie and localStorage state that previous runs left behind.
**Why:** Locale preferences are persisted in both browser storage and cookies, so the first-render assertions became dependent on test order and prior manual browsing.
**Rule:** Clear locale cookies/storage before each public-route smoke test and assert the intended first-render locale explicitly.
**Quick test:** Set `fazumi_lang=en`, rerun the public-route suite, and confirm the default-route assertions still see `lang="ar" dir="rtl"` on first load.

---

## L019 — Add schema to client routes with inline JSON-LD before changing the component boundary
**Mistake:** It is easy to treat SEO schema as a reason to convert an existing client page into a server component, even when the route already depends on client hooks for locale behavior.
**Why:** Static JSON-LD does not require a server-component rewrite; changing the boundary just for schema creates unnecessary risk around hydration and client-only state.
**Rule:** When a route already needs client hooks, emit static JSON-LD with inline `<script type="application/ld+json">` tags at the page/layout boundary instead of rewriting the route solely for SEO metadata.
**Quick test:** Load `/faq`, confirm the page still renders with `useLang()` behavior intact, and inspect the HTML for the expected JSON-LD script tags.

---

## L020 — Keep shell identity fields in sync with Auth metadata
**Mistake:** Saving a new display name updated `profiles.full_name`, but the dashboard shell still read `user.user_metadata.full_name`, so the top bar stayed stale until a later auth refresh or relogin.
**Why:** Profile persistence and Auth metadata were treated as separate sources of truth even though the shell UI depends on the Auth user object.
**Rule:** Whenever a settings flow changes shell-visible identity fields like `full_name` or `avatar_url`, update both the `profiles` row and Supabase Auth `user_metadata`, then trigger a lightweight client refresh for the mounted shell.
**Quick test:** Change the display name in Settings, save once, and confirm the top bar updates immediately without logging out.

---

## L021 — Shared components should not import types from route files
**Mistake:** `HistoryList` imported `SummaryRow` from the route file `app/history/page.tsx`, and that type import broke as soon as the dashboard routes moved into a route group.
**Why:** App Router file paths are implementation details. Route groups can change those paths without changing the public URL, so shared components that import from `app/**` become fragile.
**Rule:** If a type is used by both a route and a shared component, define it in a stable `components/**` or `lib/**` module instead of importing it from a route file.
**Quick test:** `rg "@/app/" components lib` should return zero imports from shared modules into route files for shared types/helpers.

---

## L022 — Loading states should mirror page structure, not reintroduce retired marketing UI
**Mistake:** Dashboard loading screens reused `MascotArt` plus descriptive copy, which made route transitions flash heavy content that no longer belongs in the live experience.
**Why:** Loading states were treated like standalone empty states instead of lightweight placeholders for the first visible card on each route.
**Rule:** For dashboard loading files, keep skeletons structural and page-shaped. Do not render mascots, explanatory paragraphs, or widths that differ from the live route's first card.
**Quick test:** `rg "MascotArt|LocalizedText" app/(dashboard)/*/loading.tsx` should exclude the lightweight skeleton routes, and the summarize loading shell width should match the live summarize page.

---

## L023 — Arabic UI text needs explicit mobile line-height rules, not Latin defaults
**Mistake:** Arabic body and micro-copy relied on the same relaxed line-height defaults used for Latin-heavy UI, which can make diacritics feel cramped on mobile and small labels.
**Why:** Shared typography tokens are usually tuned around Latin metrics first, so Arabic readability issues can survive until a real-device pass catches them.
**Rule:** When Arabic copy appears in shared UI text, set explicit Arabic line-height expectations in `app/globals.css` for both body-sized containers and the smallest label sizes instead of assuming the global defaults are enough.
**Quick test:** In Arabic mode, inspect `.font-arabic` plus `.text-xs` labels on a narrow viewport and confirm body text sits at `line-height: 1.8` while the smallest text renders at `line-height: 2`.

---

## L024 — Playwright smoke tests should target stable contracts, not dev-only status codes or locale-specific copy
**Mistake:** The pre-existing smoke suite hard-coded English UI strings, assumed App Router `notFound()` would surface as HTTP 404 in Playwright dev runs, and depended on live summary persistence even when the dev database schema lagged behind the app contract.
**Why:** The tests mixed several concerns at once: localized UI copy, Next.js dev-server behavior, and backend persistence details that were not the intent of each smoke assertion.
**Rule:** For Playwright smoke coverage, prefer stable selectors, hrefs, and bilingual-safe assertions. When a test is verifying UI structure or gating behavior, seed or mock non-target backend dependencies instead of coupling the smoke path to unrelated schema drift.
**Quick test:** Run `pnpm test` with Arabic as the first-render locale and a dev database that is missing optional summary columns; the smoke suite should still verify the intended UI contracts without failing on unrelated copy or save-path assumptions.

---

## L025 — Local Playwright runs need an explicit no-server mode on Windows
**Mistake:** The default Playwright `webServer` flow could hang locally when it tried to spawn `next dev`, which blocked otherwise-green smoke coverage behind runner startup timing instead of test failures.
**Why:** Local Windows runs were coupling browser tests to Playwright-managed server startup, even though the suite is also valid against an already-running dev server.
**Rule:** Keep Playwright config able to skip `webServer` via `PLAYWRIGHT_NO_SERVER=1`, and provide a repo-local helper that pre-starts a local Next server, waits on `/api/health`, and then runs the suite against that server.
**Quick test:** Start the app manually or via `pwsh ./scripts/smoke.ps1`, set `PLAYWRIGHT_NO_SERVER=1`, and confirm `pnpm test` begins running specs immediately instead of timing out while waiting for a spawned server.

---
