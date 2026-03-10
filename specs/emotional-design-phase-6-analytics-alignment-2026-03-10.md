# Emotional Design Phase 6 - Analytics Alignment

**Date:** 2026-03-10

## Goal
Align the current emotional-design rollout to the exact Phase 6 analytics contract so the new payoff, milestone, discovery, PMF follow-up, upgrade-banner, and re-engagement work is measurable without weakening privacy or putting browser analytics code on the server.

## Scope
- Replace the older first-value event with the exact `FIRST_VALUE_DELIVERED` contract
- Add the new Phase 6 event constants in `lib/analytics.ts`
- Fire the required events from the exact client surfaces:
  - `StatusLine`
  - summarize first-summary flow
  - milestone notice logic
  - discovery nudge render
  - PMF follow-up submit
  - `UpgradeBanner` seen and dismiss
- Add a server-safe `REENGAGEMENT_SENT` tracking/log path in the re-engagement cron route
- Document the event reference at the bottom of `lib/analytics.ts`

## Constraints
- Do not store or log raw chat text
- Do not break the paste -> summarize -> six-section result flow
- Keep the `ShieldCheck` privacy line copy unchanged
- Keep all new user-visible behavior bilingual and RTL-safe
- Do not import the browser PostHog client into any server file
- Run `pnpm lint` and `pnpm typecheck` before closing the phase

## Acceptance Criteria
- `lib/analytics.ts` includes `FIRST_VALUE_DELIVERED`, `STATUS_LINE_SHOWN`, `MILESTONE_REACHED`, `FEATURE_DISCOVERY_SHOWN`, `REENGAGEMENT_SENT`, `PMF_FOLLOWUP_SUBMITTED`, `UPGRADE_BANNER_SEEN`, and `UPGRADE_BANNER_DISMISSED`
- The first saved summary fires `FIRST_VALUE_DELIVERED` with a mount-time session-start approximation and does not fire on later summaries
- `StatusLine` emits `STATUS_LINE_SHOWN` when it renders
- Milestone logic emits `MILESTONE_REACHED` with `{ milestone: N }`
- The discovery nudge emits `FEATURE_DISCOVERY_SHOWN` when shown
- The PMF follow-up submission emits `PMF_FOLLOWUP_SUBMITTED`
- `UpgradeBanner` emits seen and dismissed events without breaking auto-dismiss or URL cleanup
- Re-engagement sends are tracked server-side without importing browser analytics code
- `lib/analytics.ts` ends with the requested analytics reference comment block
