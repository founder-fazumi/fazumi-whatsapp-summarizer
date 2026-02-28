# Spec — Auth + Dashboard Shell + Language/Theme

**Feature ID:** `auth-shell-lang-theme`
**Status:** Complete
**Priority:** P0 (blocks all authenticated features)

---

## Problem Statement

Fazumi has a working summarizer but no authentication, no persistent user identity,
and no consistent app shell. Users cannot save summaries, and their language/theme
preferences reset on every page load.

---

## User Journeys

### Journey 1 — New visitor (not logged in)

1. User arrives at `/` — sees the public landing page with paste box.
2. Top-right Nav shows **Log in** and **Sign up** buttons.
3. User clicks **Sign up** → arrives at `/login` (signup tab).
4. User completes signup (Google OAuth or email+password).
5. User is redirected to `/dashboard` — sees greeting + trial status banner.
6. User navigates to `/summarize`, pastes chat, submits → summary shown inline.

### Journey 2 — Returning user (active trial/paid)

1. User arrives at `/` with a valid session AND an active plan.
2. Server detects active plan → redirects immediately to `/dashboard`.
3. User sees their name, plan status, and daily usage in the banner.

### Journey 3 — Expired free user (no paid plan)

1. User arrives at `/` with a session but no active plan.
2. Landing page loads normally (no redirect).
3. A "You've used all 3 free summaries — upgrade to continue" CTA appears on the landing page.

### Journey 4 — Language toggle (global)

1. Logged-in user clicks the language toggle in TopBar → switches EN ↔ AR.
2. All nav labels, headings, and UI copy switch instantly.
3. When Arabic is active: `dir="rtl"`, `lang="ar"`, Cairo font applied to `<html>`.
4. Preference is saved to `localStorage` (instant) and Supabase `profiles.lang_pref` (async).

### Journey 5 — Theme toggle

1. User clicks sun/moon icon in TopBar → switches light ↔ dark.
2. Preference saved to `localStorage` (instant) and `profiles.theme_pref` (async).
3. On next page load: FOUC-prevention script applies the correct theme before first paint.

### Journey 6 — Sign out

1. User clicks user chip → dropdown → Sign out.
2. Supabase session cleared → user redirected to `/`.

---

## Acceptance Criteria

| # | Criterion | Test |
|---|---|---|
| AC1 | Unauthenticated visit to `/dashboard` → redirects to `/login` | Navigate to `/dashboard` while logged out |
| AC2 | Authenticated active-plan user on `/` → redirects to `/dashboard` | Log in, then visit `/` |
| AC3 | `/login` renders Google OAuth + email/password tabs; Apple disabled | Visual check |
| AC4 | After successful login → lands on `/dashboard` | Complete login flow |
| AC5 | Sidebar nav items link to correct routes and highlight active | Click each nav item |
| AC6 | TopBar shows real user name (not hardcoded "Aisha") | Check after login |
| AC7 | Theme toggle persists on hard refresh | Toggle dark → refresh → still dark |
| AC8 | Language toggle switches all UI labels; Arabic = RTL layout | Toggle to AR → check direction |
| AC9 | Sign out clears session and redirects to `/` | Click Sign out |
| AC10 | `/summarize` paste → summarize → 6-section output still works | End-to-end test |

---

## Out of Scope (this milestone)

- Lemon Squeezy payment integration (billing page is a placeholder)
- Summary persistence in DB (history page is empty state)
- Apple OAuth (button visible but disabled)
- To-Do widget real data
- Calendar event sync

---

## Open Questions (resolved)

**Q: Does the landing page stay at `/` for everyone?**
A: Yes — but active-plan users are redirected server-side before the page renders.

**Q: Where does session data come from in client components?**
A: TopBar calls `supabase.auth.getUser()` in a `useEffect` (browser client). Server pages
use `createClient()` from `lib/supabase/server.ts`. No shared context object needed.
