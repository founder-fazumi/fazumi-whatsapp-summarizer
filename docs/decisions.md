# Fazumi — Architectural Decisions

Decisions are recorded in chronological order. Each entry includes context, the decision, and the consequences. Update this file whenever a significant architectural or product decision is made.

---

## D001 — Separate web app from WhatsApp bot
**Date:** 2026-02-27
**Context:** The existing repo is a Node.js/Express WhatsApp webhook server (360dialog integration) + a worker pool that summarizes via OpenAI and replies back via WhatsApp. This is **not** a web app. The FAZUMI product mission is a web-based micro-SaaS.
**Decision:** Keep the existing WhatsApp bot code as-is under `services/wa-bot/` (renamed from `src/`). Build the new Next.js web app as the **primary product** at the repo root (or `web/`). The WhatsApp bot remains a future/secondary channel.
**Consequences:** Two runnable services live in the same repo. Vercel will deploy the Next.js app. Cloud Run / Render continue to run the WA bot independently.

---

## D002 — Repo restructure: next.js at root
**Date:** 2026-02-27
**Context:** Vercel expects a Next.js project at the repo root (or a configured `rootDirectory`). The WA bot currently occupies the root.
**Decision:** Move WA bot files into `services/wa-bot/`. Scaffold Next.js into repo root. The existing `package.json` will be replaced by the Next.js `package.json`. Bot `package.json` lives in `services/wa-bot/`.
**Consequences:** Existing `node_modules/` and `package-lock.json` at root get replaced. Supabase migrations folder stays at root under `supabase/`. `.env.example` for WA bot moves to `services/wa-bot/.env.example`. New `.env.local.example` created for web app.

---

## D003 — Stack is locked
**Date:** 2026-02-27
**Context:** Founder specified stack in CLAUDE.md.
**Decision:**
- Framework: Next.js 14+ App Router, TypeScript strict
- Styling: Tailwind CSS + shadcn/ui
- Database + Auth: Supabase (Postgres, Auth, Storage)
- Auth providers: Google + Apple (via Supabase)
- Payments: Lemon Squeezy
- Deploy: Vercel
- Package manager: pnpm
**Consequences:** No alternatives considered. All PRs must use this stack.

---

## D004 — No raw chat storage (privacy by design)
**Date:** 2026-02-27
**Context:** CLAUDE.md and existing bot code both enforce data minimization.
**Decision:** The web app **never persists** raw pasted text or uploaded files. Text is processed in memory (API route), summary + extracted structured items are stored in Supabase. Uploads are never written to disk or Supabase Storage.
**Consequences:** Simpler GDPR posture. Cannot offer "re-summarize with different settings" without re-pasting (acceptable for MVP).

---

## D005 — AI provider: OpenAI (gpt-4o-mini default)
**Date:** 2026-02-27
**Context:** Existing bot already uses OpenAI. Founder has credentials.
**Decision:** Use `gpt-4o-mini` as default model for cost efficiency. Allow upgrade to `gpt-4o` via env var `OPENAI_MODEL`. Use the summary prompt format already validated in the WA bot (adapted for web output format).
**Consequences:** OpenAI dependency. Rate limits managed server-side per user plan.

---

## D006 — Summary output format (locked, 6 sections)
**Date:** 2026-02-27
**Context:** Specified in CLAUDE.md.
**Decision:** Always output in this exact order:
1. TL;DR
2. Important Dates (date + time + location)
3. Action Items / To-Do
4. People/Classes mentioned
5. Links / Attachments referenced
6. Questions to ask teacher/school
**Consequences:** AI prompt must enforce this structure. UI renders each section as a distinct card.

---

## D007 — Pricing and limits (server-enforced)
**Date:** 2026-02-27
**Context:** Specified in CLAUDE.md.
**Decision:**
- Free trial: 7 days from signup
- Free fallback: 3 lifetime summaries for no-card users after trial
- Paid monthly: $9.99/mo — 50 summaries/day, 200/month
- Paid annual: $99.99/yr — same limits
- Founder LTD: $149 one-time, 200 seats max, includes 1-year top tier, NO refund
- All limits enforced in server-side API routes (never trust client)
**Consequences:** DB must track: `plan`, `trial_expires_at`, `summaries_today`, `summaries_month`, `lifetime_free_count`, `founder_seat`.

---

## D008 — Auth: Supabase with Google + Apple
**Date:** 2026-02-27
**Context:** Stack locked. Mobile-first product needs social auth (no password friction).
**Decision:** Use Supabase Auth with Google OAuth and Apple OAuth. No email/password for MVP. Magic link as fallback (optional, decide at implementation).
**Consequences:** Need to configure OAuth apps in Google Cloud Console and Apple Developer. Supabase handles token storage.

---

## D009 — Ingestion: paste-first, upload-second
**Date:** 2026-02-27
**Context:** Specified in CLAUDE.md.
**Decision:** Primary UX is paste text (max 30,000 chars). Also accept `.txt` and `.zip` WhatsApp export files (zip max 10MB). Zip handling: extract text files, ignore/reject media with warning. Processing is in-memory only.
**Consequences:** No file storage infra needed for MVP. Server streaming for zip parsing.

---

## D010 — Referral system (simple, MVP)
**Date:** 2026-02-27
**Context:** CLAUDE.md mandates referral as Phase 1.
**Decision:** Simple referral codes: unique code per user. Referred user gets "$3 off first month". Referrer gets $3 credit after referred user pays. Track in DB: `referral_code`, `referred_by`, `referral_credit_usd`. Apply credit at Lemon Squeezy checkout via discount code lookup.
**Consequences:** Does not require complex affiliate tracking. Lemon Squeezy discount codes are pre-created; referral credit is tracked in DB for simplicity.

---

## D011 — Global i18n + RTL approach (locked)
**Date:** 2026-02-28
**Context:** App must support English (LTR) and Arabic (RTL) throughout: landing, dashboard, summaries.
**Decision:**
- UI language stored in `localStorage` as `fazumi_lang` via `LangContext`. Switch calls `setLocale()` which updates `document.documentElement.lang` and `dir`.
- Static copy uses `LocalizedCopy<string>` objects `{ en, ar }`, rendered via `pick(obj, locale)` or `<LocalizedText en=".." ar=".." />`.
- `lib/i18n.ts` handles `t(key, locale)` for dashboard shell structured keys.
- `lib/format.ts` enforces Western (Latin) digits everywhere — see D012.
- Summary output language is separate from UI locale: controlled by `langPref` (auto/en/ar) in the summarize form; resolved via `resolveOutputLanguage()` in `lib/ai/summarize.ts`.
**Consequences:** Any new component with user-visible text must use `pick()` or `<LocalizedText>`. Numbers must go through `lib/format.ts`. Never use raw `n.toString()` for displayed numbers.

---

## D012 — Digits forced to Latin numeral system
**Date:** 2026-02-28
**Context:** When `document.documentElement.lang = "ar"`, browsers render numbers in Eastern Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) instead of Western digits (0–9), breaking pricing, counts, dates.
**Decision:** All numeric formatting goes through `lib/format.ts` which hard-codes `numberingSystem: "latn"` in every `Intl.NumberFormat` and `Intl.DateTimeFormat` call. Never use bare `n.toLocaleString()` or `n.toString()` for displayed numbers.
**Consequences:** All components updated. New components must import `formatNumber`, `formatPrice`, or `formatDate` from `lib/format.ts`.

---

## D013 — Trial limit: unlimited → 3 summaries/day
**Date:** March 2026
**Context:** CLAUDE.md originally said "unlimited during trial". Product review determined 3/day during the 7-day trial balances demo value vs abuse risk.
**Decision:** Free trial = 3 summaries/day for 7 days. Post-trial free = 3 lifetime total. Paid = 50/day.
**Consequences:** `lib/limits.ts` LIMITS.trial = 3. CLAUDE.md updated. Dashboard + summarize page derive limit correctly via getDailyLimit().

---

## D014 — Icon system: lucide-react everywhere, no emoji
**Date:** March 2026
**Context:** Emoji characters were used as inline icons throughout the app (🦊 logo, 📋 stats, 📅 dates, ✅ actions, 📭 empty states, etc.). Emoji render inconsistently across OS/font stacks and look unprofessional in a paid product.
**Decision:** Replace all emoji with lucide-react icons (already installed, v0.575.0). Use existing brand image assets from `public/brand/` for the Fazumi logo mark. Create two shared components: `components/shared/BrandLogo.tsx` (logo image wrapper) and `components/shared/EmptyState.tsx` (reusable empty state pattern). `SECTION_META.icon` in `SummaryDisplay` changes from `string` to `React.ComponentType`. No new icon library is added.
**Consequences:** All new components must use lucide-react for icons. Never use emoji as UI icons. Brand logo placements must use `<BrandLogo>`. Empty states must use `<EmptyState>`.

---

## D015 — Keep current stack; reject Wasp/OpenSaaS and SuperTokens
**Date:** March 2026
**Context:** Evaluated alternative SaaS frameworks (Wasp, OpenSaaS) and auth libraries (SuperTokens) as potential accelerators. Both categories require meaningful rewrite effort: Wasp generates its own file structure incompatible with the current App Router layout; SuperTokens replaces Supabase Auth and would require migrating existing sessions and profiles.
**Decision:** Do NOT adopt Wasp, OpenSaaS, or SuperTokens. Keep the current stack exactly as-is: Next.js App Router + Supabase Auth/DB + Lemon Squeezy payments. All three are already integrated and working.
**Rationale:** The rewrite cost exceeds any DX gain at this stage. Time-to-ship is the constraint. Any framework migration is a pre-launch distraction.
**Consequences:** Future infra additions must be additive bolt-ons (monitoring SDK, edge function, etc.), not framework replacements. Revisit only after MVP revenue is stable.

---

## D016 — Admin dashboard is dev-only and service-role backed
**Date:** 2026-03-02
**Context:** Internal admin metrics are needed locally, but shipping a public hardcoded admin credential or a production-facing service-role dashboard would be unsafe at MVP stage.
**Decision:** Add `/admin_dashboard` only for local development. Access is gated by a dev-only HttpOnly cookie set from `/admin_dashboard/login`, using `ADMIN_USER` and `ADMIN_PASS` when present or `admin / admin` by default. All `/api/admin/*` endpoints are server-only, require the same cookie, and use the Supabase service role strictly on the server. Production blocks the entire admin dashboard surface.
**Consequences:** Local admin diagnostics stay simple and cheap, while production avoids exposing a second auth surface or any client-visible service-role behavior. Any future production admin panel should replace this with real operator auth instead of extending the dev gate.
---

## D017 - Admin auth fails closed without explicit credentials
**Date:** 2026-03-07
**Context:** The audit found that the local admin dashboard enabled itself whenever Supabase admin env vars existed and silently fell back to `admin / admin`, which is unsafe even for a launch candidate.
**Decision:** The admin dashboard now requires both `ADMIN_USERNAME` and `ADMIN_PASSWORD` in addition to the existing server-side Supabase admin env vars. If either credential is missing, `/admin/login`, `/admin_dashboard`, and `/api/admin/*` all stay disabled through the normal auth flow.
**Consequences:** There are no fallback admin credentials anywhere in the repo. Local admin smoke tests must use explicit env-configured credentials or assert the dashboard is disabled.

---

## D018 - Paid entitlements resolve from subscription state first
**Date:** 2026-03-07
**Context:** Paid gating and summarize quotas were drifting because webhook updates changed `subscriptions.status` while large parts of the app still trusted `profiles.plan` alone.
**Decision:** One shared entitlement resolver now derives access from the latest relevant subscription state first, with `profiles.plan` kept only as a legacy fallback when no paid subscription row exists. `past_due`, `cancelled`, and `expired` remove paid access immediately; recovery restores access when Lemon Squeezy reports the subscription as `active` again.
**Consequences:** Summarize limits, billing state, and paid feature gating use the same decision path. Webhook handling now reconciles `profiles.plan` from that resolver so older UI surfaces fail safe instead of drifting on stale paid plans.

---

## D019 - Arabic-first is the explicit first-render locale
**Date:** 2026-03-07
**Context:** The app already rendered Arabic on first load when no stored preference existed, but Playwright public-route coverage still assumed English defaults and could leak prior locale state.
**Decision:** Arabic (`ar`, RTL) remains the explicit first-render locale when neither the cookie nor local storage has a saved language preference.
**Consequences:** Public-route smoke tests must clear stored locale state before navigation and assert Arabic-first copy/direction by default. English remains a supported explicit preference, not the fallback default.

---

## D020 - Public JSON-LD stays inline at the route boundary
**Date:** 2026-03-07
**Context:** The SEO Round 3 pass needed richer schema on `/faq` and `/about`, but `/faq` already depends on client hooks for locale state and Next.js metadata APIs do not directly expose arbitrary JSON-LD blocks from layouts/pages.
**Decision:** Keep route-specific JSON-LD as inline `<script type="application/ld+json">` blocks rendered directly from the page or layout boundary. Do not rewrite a client page into a server component solely to add static schema.
**Consequences:** `/faq` can keep its existing `useLang()` client logic while still shipping `FAQPage`, `BreadcrumbList`, and `WebPage` schema. Future public SEO schema should prefer boundary-level inline scripts before changing component ownership.

---

## D021 - Founder recognition stays in the dashboard shell and uses browser-local welcome state
**Date:** 2026-03-08
**Context:** Founder users already had billing recognition plus a dedicated `/founder` story page, but they still lacked a persistent in-shell route entry point and a first-time acknowledgement inside the dashboard itself.
**Decision:** Keep founder recognition in the existing dashboard shell by adding a founder-only sidebar link to `/founder`, and implement the first-time welcome modal as a client-only browser preference keyed in `localStorage` instead of introducing a server-tracked onboarding flag.
**Consequences:** Founder recognition remains visible wherever the shell is mounted, while the one-time modal stays simple and does not require schema/API changes or additional persisted user state.

---

## D022 - Public founder offer lives at `/founder-supporter`, not `/founder`
**Date:** 2026-03-09
**Context:** FAZUMI now needs a dedicated public founder-offer landing page for campaigns and direct conversion, but `/founder` already exists as a logged-in dashboard page for recognized founder members.
**Decision:** Keep `/founder` as the in-app founder recognition route and add the public marketing page at `/founder-supporter`. The public page reuses the existing founder checkout variant and the current public founder seat cap of `350`.
**Consequences:** Campaign traffic gets a purpose-built sales page without breaking existing founder UX inside the dashboard shell. Any future public founder CTA should point to `/founder-supporter`, while in-app founder recognition remains on `/founder`.

---

## D023 - Shared admin primitives can grow without breaking legacy FAQ callers
**Date:** 2026-03-09
**Context:** The admin inbox item panel needs shadcn-style accordion and select compound components, but the live repo's shared accordion file only exposed a legacy FAQ helper API and there was no local select wrapper.
**Decision:** Add the required compound UI primitives locally under `components/ui/`, and keep the existing FAQ/help/founder-offer behavior by preserving legacy accordion exports alongside the new compound API instead of replacing the old callers outright.
**Consequences:** Admin surfaces can adopt richer compound primitives without a package install or a wide rewrite of older marketing/support pages. Future shared primitive migrations should keep backwards-compatible exports long enough to move legacy callers intentionally.

---

## D024 - Founder-support transparency note lives on a hidden noindex public route
**Date:** 2026-03-09
**Context:** The public `/founder-supporter` offer page now needs a softer transparency follow-up for warm visitors who want to understand where early support goes, but that note should stay discoverable from the founder flow without becoming a search-targeted marketing page.
**Decision:** Add the founder transparency note at `/founder-support` as a public App Router page with route-level `robots: { index: false, follow: false }`, keep it out of the sitemap, and link to it from `/founder-supporter` with return CTAs back into the founder plan section.
**Consequences:** Founder supporters get a calmer, trust-building explanation without cluttering the main founder offer or creating another indexed acquisition page. The route remains easy to share directly in founder conversations while staying intentionally secondary to `/founder-supporter`.

---

## D025 - Digest notifications share one 7 AM window, but their tracking scopes differ
**Date:** 2026-03-09
**Context:** The emotional-design rollout added a Sunday weekly progress recap and a 14-day inactivity reminder on top of the existing 7 AM morning digest. The original push scheduler only had one generic `push_subscriptions.last_notified_at`, which was too broad for multiple cadences and could let unrelated pushes suppress digest delivery.
**Decision:** Keep all school-notification delivery inside the existing 7 AM local-time push window, but separate cadence tracking by scope:
- Daily and weekly digest delivery are tracked on `push_subscriptions` via `last_morning_digest_at` and `last_weekly_digest_at`
- Inactivity re-engagement is tracked on `profiles.last_reengagement_sent_at` so it stays once-per-gap at the user level
- The Sunday weekly recap replaces that day's daily digest instead of sending a second notification
**Consequences:** Notification behavior stays calmer and easier to audit. Generic push sends no longer interfere with digest cadence, weekly progress stays opt-in without doubling Sunday notifications, and inactivity reminders cannot repeat across multiple browser subscriptions until a new summary resets the gap.

---

## D026 - The summary result stays a six-section contract even when metadata grows
**Date:** 2026-03-10
**Context:** The structured summary schema includes `contacts`, but the locked FAZUMI output contract still requires six user-facing sections in a fixed order. The live result renderer had drifted into showing `Contacts` as a seventh card.
**Decision:** Keep the user-facing result and export output at six sections. Preserve structured `contacts`, but fold them into `Links / Attachments referenced` unless the product contract is explicitly updated to add another section.
**Consequences:** Schema growth does not silently change the parent-facing result UX. Any future summary field that wants its own card must go through spec, copy, and acceptance-criteria review first.

---

## D027 - Payment acquisition stays in a coming-soon state until provider approval
**Date:** 2026-03-10
**Context:** FAZUMI's pricing and founder surfaces were already wired for Lemon Squeezy-style checkout, but provider approval is still pending and the public UI should not imply that payment is live.
**Decision:** Keep pricing and upgrade surfaces visible, but gate all new payment-acquisition CTAs behind a shared coming-soon flag. Purchase buttons stay disabled and use explicit `Coming soon` / `قريبًا` copy, while existing paid-account management links remain unchanged.
**Consequences:** Users can still inspect plans and pricing, but they cannot be sent into a fake or premature checkout flow. Re-enabling payments later becomes one shared config change instead of a scattered copy pass across multiple routes.

---

## D028 - Password recovery uses a dedicated browser route, not the server auth callback
**Date:** 2026-03-10
**Context:** Email/password auth already existed, but adding forgot-password exposed that Supabase recovery links return browser hash tokens rather than the server-readable `code` used by OAuth and email-confirm flows.
**Decision:** Start password recovery from `/login`, but send the recovery redirect straight to `/reset-password` instead of `/auth/callback`. The reset page establishes the recovery session from the Supabase hash payload, clears the hash from the URL, validates the new password, then signs the user out globally and returns them to `/login?reset=success`.
**Consequences:** The recovery flow matches the way Supabase currently delivers reset sessions without requiring a custom email template or a second auth service. OAuth and other code-exchange flows keep using `/auth/callback`, while password reset remains isolated to one browser-only route.

---

## D029 - Dashboard identity prefers the profile row, and avatar uploads stay inside Supabase
**Date:** 2026-03-10
**Context:** `/settings` could save `full_name`, but `/dashboard` still derived its greeting from auth metadata that may lag behind the saved profile row. The same settings screen also required a pasted public avatar URL instead of a direct device upload flow.
**Decision:** Server-rendered dashboard identity now prefers `profiles.full_name` over auth metadata, while still mirroring profile identity fields into Supabase Auth `user_metadata` for shell surfaces that depend on the auth user object. Avatar changes use an authenticated `/api/profile/avatar` upload route backed by a Supabase Storage `avatars` bucket instead of a manual URL field. Identity writes update Auth metadata first, roll back on downstream profile-write failure, and expose an explicit avatar-delete path instead of relying on a hidden clear-state side effect.
**Consequences:** The dashboard greeting reflects the saved profile name without waiting on a later auth refresh, and profile photo changes stay within the existing Supabase stack with no external image host or raw chat storage impact. The settings UI keeps an intentional remove-photo affordance, and partial failures are less likely to leave the dashboard shell and profile row showing different identity data.

---

## D030 - Summary generation keeps a chat-completions request shape that is safe across model families
**Date:** 2026-03-10
**Context:** The landing demo and authenticated summarize flow share one OpenAI chat-completions request. A production model/env change can break both routes at once if the request still relies on deprecated or model-specific parameters.
**Decision:** Keep the current chat-completions-based summarize flow for now, but centralize the JSON request builder and use `max_completion_tokens` instead of `max_tokens`. For GPT-5 and o-series chat models, omit legacy sampling controls like `temperature`; for current non-reasoning chat models, keep the deterministic temperature setting.
**Consequences:** Summary generation is more resilient to `OPENAI_MODEL` changes without forcing a larger Responses API migration in this hotfix. Any future summarize-model change should go through the shared builder instead of hand-built request objects in each route.

---

## D031 - Summarize falls back to the safe default model if Vercel points at an invalid OpenAI model ID
**Date:** 2026-03-11
**Context:** Live production verification after D030 still showed `POST /api/demo/summarize` failing with `Error: 400 invalid model ID` in Vercel logs. Both the landing demo and the authenticated summarize flow depend on the same `OPENAI_MODEL` setting, so one bad Vercel value could still take down the whole summarize experience.
**Decision:** Keep the shared Chat Completions summarize path, but add one shared retry guard: if the configured summarize model is rejected with `invalid model ID`, retry once with the known-safe default `gpt-4o-mini`, log the fallback server-side, and record the actual model used in usage metadata. Also reset the Vercel production `OPENAI_MODEL` value to `gpt-4o-mini` for the immediate recovery.
**Consequences:** A bad `OPENAI_MODEL` env value now degrades to the safe default instead of surfacing a generic 500 to end users, and Vercel config drift is less likely to become a parent-facing outage. The app still logs the fallback so the misconfiguration can be corrected instead of silently living forever.

---

## D032 - `/summarize` keeps the generated result in the first reading path
**Date:** 2026-03-11
**Context:** The conversational redesign had already narrowed `/summarize`, but the page still stacked output-language, setup, and ZIP cards ahead of the actual result. On desktop this wasted width, and on the main parent flow it forced users to scroll past support controls before they could read the summary they just asked for.
**Decision:** Keep `/summarize` paste-first, but widen the route canvas and split it into two zones: the main column owns the composer plus the generated result, while output-language, source/group setup, and ZIP import live in a secondary support rail. Within the result card, promote the calendar/todo/share actions above the detailed sections so the next step is visible immediately.
**Consequences:** The summary now appears directly below the paste composer instead of below setup cards, which better matches the parent mental model of "paste, get the answer, then act on it." Secondary controls still exist, but they no longer dominate the first-value path or compress the result grid unnecessarily.

