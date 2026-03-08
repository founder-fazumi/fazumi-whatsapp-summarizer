# Founder Supporter UX — Phase 2

**Date:** 2026-03-08

## Goal
Finish the founder in-app experience with lighter font loading, better Arabic readability on mobile, a persistent founder route entry point in the dashboard shell, and a one-time founder welcome moment on the dashboard.

## Scope
- Pin Manrope to the explicit weights used by the app
- Improve Arabic body and micro-text readability in `app/globals.css`
- Add iOS font smoothing and Android tap-highlight suppression without adding new packages
- Add a founder-only sidebar link to `/founder`
- Show a client-only founder welcome modal on `/dashboard` the first time a founder lands there

## Constraints
- CSS-only for the three font/readability fixes
- No API changes
- Keep all new founder copy bilingual
- Founder-only surfaces must remain hidden for non-founder users

## Acceptance Criteria
- `app/layout.tsx` sets `Manrope` `weight: ["400", "500", "600", "700"]`
- Arabic text containers get `line-height: 1.8`, `letter-spacing: 0.01em`, and small Arabic micro-text gets `line-height: 2`
- `body` includes `-webkit-tap-highlight-color: transparent` without duplicating existing font smoothing
- Founder users see a sidebar nav item for `/founder` with a `Star` icon and bilingual `Founding Supporter` label
- Founder users see a one-time welcome modal on `/dashboard`, dismissed via CTA or backdrop and persisted via `localStorage`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
