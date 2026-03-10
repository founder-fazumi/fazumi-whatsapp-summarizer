# Emotional Design Improvements

**Date:** 2026-03-09

## Goal
Make FAZUMI feel more emotionally rewarding, habit-forming, and must-have for busy GCC parents without using dark patterns, breaking privacy guarantees, or destabilizing the paste-to-summary flow.

## Scope
- Add a calmer, more reassuring post-summary payoff on the result screen
- Surface a StatusLine above the summary sections using existing structured summary data
- Reflect saved family context back into the result experience
- Warm the payment, limit, and history-empty states with benefit-led copy
- Add milestone acknowledgements and contextual discovery nudges for existing secondary features
- Add progress feedback on the dashboard and a weekly progress summary
- Extend PMF follow-up using the existing PMF API fields
- Add a safe, capped inactivity re-engagement path only if it can be done without new service complexity

## Constraints
- Do not store raw chat text or upload contents
- Keep the `ShieldCheck` privacy line on the result screen visible and unchanged
- Keep the six-section summary output and core summarize flow intact
- All new user-facing copy must be bilingual and RTL-safe
- Reuse existing components, tokens, analytics, and push infrastructure where possible
- Avoid manipulative urgency, childish gamification, and spammy notification frequency
- Run `pnpm lint` and `pnpm typecheck` after each phase
- Run `pnpm build` after Phase 2 and Phase 8
- Do not commit or deploy

## Phase Plan
1. Result-screen emotional payoff, StatusLine, family-context reflection, and time-to-first-value analytics
2. Upgrade/payment/history-empty/limit-state emotional rewrite
3. Milestone acknowledgements and contextual feature-discovery nudges
4. Dashboard trajectory indicators and weekly progress summary
5. PMF modal follow-up extension using existing API support
6. Weekly digest notification extension only if the safe version stays small; otherwise keep the digest in-app and defer push
7. Inactivity re-engagement with once-per-gap protection
8. Final verification, tracker updates, and rollout notes

## Acceptance Criteria
- The summary result includes a calm post-generation payoff and a structured StatusLine without removing the existing privacy promise
- Family context is visibly reflected back to the user when it exists
- Payment, limit, and empty states explain the benefit to the family, not just the system status
- Milestone and progress feedback feel premium and adult, not gamified
- PMF "Very disappointed" responders get a short follow-up prompt without replacing the current survey
- Any notification-based addition stays opt-in or strictly capped according to the product rules
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build` after Phase 2 and Phase 8
