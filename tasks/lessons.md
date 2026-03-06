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
