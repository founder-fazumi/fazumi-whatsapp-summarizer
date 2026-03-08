# Founder Supporter UX — Phase 0

**Date:** 2026-03-08

## Goal
Give `plan === "founder"` users a distinct identity inside the existing app shell and billing flow without adding new routes.

## Scope
- Add a founder-specific badge and label in the top bar
- Add a founder-specific badge and subtitle in the dashboard banner
- Add a founder thank-you card on `/billing`
- Hide founder upgrade/checkout UI on `/billing`
- Fix the Arabic afternoon greeting window in `lib/i18n.ts`
- Sync profile name changes into Supabase Auth metadata so the shell updates without requiring logout/login

## Constraints
- No new pages
- All new copy must have both English and Arabic values
- Keep founder users treated as paid for entitlements and upgrade gating

## Acceptance Criteria
- Top bar shows `Founding Supporter` / `مؤسس داعم` with an amber `Star` icon for founder users
- Dashboard banner shows an amber founder badge and founder-only subtitle
- Billing shows a founder thank-you card and hides the upgrade/checkout panel for founder users
- `getTimeAwareGreeting()` returns afternoon copy for 12:00-16:59 in both English and Arabic
- Saving a new display name updates the shell name without forcing logout/login
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
