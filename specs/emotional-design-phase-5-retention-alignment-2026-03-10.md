# Emotional Design Phase 5 Retention Alignment

**Date:** 2026-03-10

## Goal
Align the live retention mechanics with the exact Phase 5 prompt by making the morning digest more personally rewarding, moving inactivity re-engagement into a dedicated protected cron path, and extending the PMF modal with the requested two-step follow-up for "Very disappointed" responders.

## Scope
- Update the morning digest payload to use a 7-day summary window, action-item counts, group-name personalization, and a fallback message when there are no summaries in the last 7 days
- Add `app/api/cron/reengagement/route.ts` behind `CRON_SECRET` and reuse the existing push infrastructure with once-per-gap protection
- Change `components/pmf/PmfSurveyModal.tsx` to a two-step flow that records the initial PMF response first, then asks the optional `biggest_benefit` follow-up only for `very_disappointed`

## Constraints
- Do not store raw chat text
- Keep all new user-facing copy bilingual and RTL-safe
- Reuse the existing Supabase service-role client and push helpers
- Do not send more than one re-engagement reminder per user in a 28-day cooldown window
- Keep the current summarize flow and privacy promise unchanged

## Acceptance Criteria
- Morning digest notifications still send safely, now using the requested weekly-count copy and the no-summaries fallback
- Re-engagement runs from its own authorized cron route and updates `profiles.last_reengagement_sent_at` only after a successful send
- The PMF modal shows the optional follow-up screen only for `very_disappointed`, posts `biggest_benefit`, and stays bilingual plus RTL-safe
- `pnpm lint`
- `pnpm typecheck`
