# Spec: Payment CTA Copy Refinement (2026-03-10)

## Goal
Make the purchase CTAs on the landing pricing block, `/pricing`, and `/billing` read as plain coming-soon copy while checkout remains disabled.

## Scope
- Replace appended purchase CTA copy with exact `Coming soon` / `قريبًا` labels on payment-acquisition buttons rendered through the shared checkout button.
- Keep the disabled checkout guard in place so no purchase CTA can send users to Lemon Squeezy checkout.
- Leave paid-account management links and non-payment navigation unchanged.

## Non-goals
- No webhook, subscription, or entitlement backend changes.
- No pricing-number or plan-structure changes.
- No changes to existing paid-user portal/update-payment links.

## Acceptance
1. Landing pricing, `/pricing`, and `/billing` plan-card purchase buttons show exact `Coming soon` in English and `قريبًا` in Arabic.
2. Those purchase buttons remain disabled and cannot navigate to `https://fazumi.lemonsqueezy.com/checkout`.
3. `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass after the refinement lands.
