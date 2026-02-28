# Tasks — Auth + Dashboard Shell + Language/Theme

**Feature ID:** `auth-shell-lang-theme`
**Implements:** [spec.md](./spec.md) · [plan.md](./plan.md)

> **Legend:** `[x]` done · `[ ]` pending · `[P]` can run in parallel · `[!]` blocks others

---

## Chunk 1 — Supabase Infrastructure + Middleware
> Verify: `/dashboard` (no session) → redirects to `/login`

- [x] [!] Install `@supabase/supabase-js @supabase/ssr`
- [x] [P] `lib/supabase/types.ts` — Profile + UsageDaily interfaces
- [x] [P] `lib/supabase/client.ts` — createBrowserClient singleton
- [x] [P] `lib/supabase/server.ts` — createServerClient + await cookies()
- [x] [P] `lib/supabase/middleware.ts` — updateSession() route guard
- [x] [P] `middleware.ts` (repo root) — calls updateSession(); broad matcher
- [x] [P] `supabase/migrations/20260301_create_profiles.sql`
- [x] [P] `supabase/migrations/20260301_create_usage_daily.sql`
- [x] `app/layout.tsx` — Add FOUC inline `<script>` in `<head>`
- [x] Checkpoint: `pnpm lint && pnpm typecheck && pnpm test`
- [x] Commit + push: "feat: auth + routing — Supabase clients, middleware, DB migrations"

---

## Chunk 2 — Providers + Login Page
> Verify: `/login` renders; Google triggers Supabase; email wrong-pass shows error; no FOUC

- [x] [P] `lib/i18n.ts` — t(key, locale) with EN/AR map (30+ keys)
- [x] [P] `lib/context/ThemeContext.tsx` — ThemeProvider + useTheme()
- [x] [P] `lib/context/LangContext.tsx` — LangProvider + useLang()
- [x] [P] `app/login/page.tsx` — Google + email/pass tabs; Apple disabled
- [x] [P] `app/auth/callback/route.ts` — exchangeCodeForSession → /dashboard
- [x] `app/layout.tsx` — Wrap children in ThemeProvider + LangProvider
- [x] Checkpoint: `pnpm lint && pnpm typecheck && pnpm test`
- [x] Commit + push: "feat: auth + routing — providers, login page, auth callback"

---

## Chunk 3 — Dashboard Shell + All Route Stubs
> Verify: all routes render; sidebar active highlight; user pill shows real name; sign out works

- [x] [P] `components/ui/avatar.tsx` — initials circle + img fallback
- [x] [P] `components/ui/dropdown-menu.tsx` — trigger/items; click-outside
- [x] [P] `components/ui/dialog.tsx` — open/onOpenChange; Escape-close
- [x] [P] `components/layout/SearchDialog.tsx` — filterable nav links
- [x] [P] `components/dashboard/DashboardBanner.tsx` — plan/trial/usage props
- [x] `components/layout/Sidebar.tsx` — real hrefs; i18n; active state
- [x] `components/layout/TopBar.tsx` — real session; dropdown; toggles; search
- [x] [P] `app/dashboard/page.tsx` — DashboardBanner + quick-action card
- [x] [P] `app/history/page.tsx` — empty state
- [x] [P] `app/calendar/page.tsx` — CalendarWidget centered
- [ ] [P] `app/settings/page.tsx` — theme + lang cards (save logic in Chunk 4)
- [ ] [P] `app/billing/page.tsx` — plan card + portal CTA
- [ ] [P] `app/profile/page.tsx` — read-only name/email
- [ ] [P] `app/help/page.tsx` — FAQ accordion + contact
- [ ] [P] `app/privacy/page.tsx` — static placeholder
- [ ] [P] `app/terms/page.tsx` — static placeholder
- [ ] [P] `app/refunds/page.tsx` — static placeholder
- [ ] [P] `app/pricing/page.tsx` — Pricing component + Nav
- [ ] Checkpoint: `pnpm lint && pnpm typecheck && pnpm test`
- [ ] Commit + push: "feat: dashboard shell — all route stubs + UI components"

---

## Chunk 4 — Settings Persistence + Auth-Aware Landing
> Verify: Settings toggle → DB updated; Landing nav shows Login/Signup or Dashboard

- [ ] [P] `app/api/profile/route.ts` — PATCH lang_pref/theme_pref
- [ ] `app/settings/page.tsx` — wire toggles to PATCH; show "Saved ✓"
- [ ] `components/landing/Nav.tsx` — add isLoggedIn prop
- [ ] `app/page.tsx` — async RSC; session check; active-plan redirect
- [ ] Checkpoint: `pnpm lint && pnpm typecheck && pnpm test`
- [ ] Commit + push: "feat: settings persistence + auth-aware landing nav"

---

## Chunk 5 — Usage Tracking + Legal Content
> Verify: 3 free summaries → 4th blocked; usage_daily upserted; legal pages have full copy

- [ ] `app/api/summarize/route.ts` — auth + usage check + admin upsert
- [ ] `app/summarize/page.tsx` — handle 401/402 inline banners
- [ ] `app/dashboard/page.tsx` — fetch today's usage_daily; pass to DashboardBanner
- [ ] `components/dashboard/DashboardBanner.tsx` — live trial countdown + progress
- [ ] `app/privacy/page.tsx` — full copy (7 sections)
- [ ] `app/terms/page.tsx` — full copy (8 sections)
- [ ] `app/refunds/page.tsx` — full copy (3 sections)
- [ ] `app/help/page.tsx` — full FAQ + contact
- [ ] Checkpoint: `pnpm lint && pnpm typecheck && pnpm test`
- [ ] Commit + push: "feat: usage tracking + legal pages"

---

## Acceptance Criteria checklist

| AC | Description | Chunk |
|---|---|---|
| AC1 | Unauthenticated `/dashboard` → redirects to `/login` | 1 ✅ |
| AC2 | Active-plan user on `/` → redirects to `/dashboard` | 4 |
| AC3 | `/login` has Google + email tabs; Apple disabled | 2 ✅ |
| AC4 | After login → lands on `/dashboard` | 2 ✅ |
| AC5 | Sidebar nav links correct routes + active highlight | 3 |
| AC6 | TopBar shows real user name (not hardcoded) | 3 |
| AC7 | Theme toggle persists on hard refresh | 2 ✅ |
| AC8 | Language toggle switches labels; Arabic = RTL | 3 |
| AC9 | Sign out clears session → redirects to `/` | 3 |
| AC10 | `/summarize` paste → summarize → 6-section output works | 5 |
