# Spec: Payments Coming-Soon Gate (2026-03-10)

## Goal
Temporarily gate FAZUMI's payment acquisition UI until Lemon Squeezy or another payment provider is approved.

## Scope
- Disable public purchase CTAs so they do not redirect to checkout.
- Append `(coming soon)` / `(قريبًا)` to payment-related CTA labels.
- Update upgrade and view-plan links that point users toward billing or pricing so they also read as coming soon.
- Show a clear supporting note on pricing that payments are pending provider approval.

## Non-goals
- No webhook, subscription, or entitlement backend changes.
- No pricing-number changes.
- No changes to active paid-user management links already tied to existing subscription state.

## Acceptance
1. Pricing and founder purchase CTAs are visibly disabled and no longer attempt checkout redirects.
2. Payment acquisition labels append `(coming soon)` in English and `(قريبًا)` in Arabic.
3. Upgrade and view-plan CTAs in the dashboard/summarize/billing surfaces use the same coming-soon wording while keeping the routes usable.
4. Pricing shows a short note that payments are pending provider approval.
5. `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass after the gate lands.
