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

