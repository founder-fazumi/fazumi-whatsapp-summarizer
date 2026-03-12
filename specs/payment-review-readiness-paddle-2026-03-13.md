# Spec - Payment Review Readiness for Paddle (2026-03-13)

## Context
- Paddle provisionally approved `fazumi.com`.
- The current review blockers are public-policy issues, not a rejected business model.
- The highest-priority blocker is refund-policy compliance: the live site still uses a 7-day window and exception-heavy wording.
- Public billing copy also still mixes Lemon Squeezy naming, "coming soon" gating, and inconsistent founder positioning.

## Decision
- Make the public refund story simple and consistent: a 14-day minimum refund-request window for paid purchases, no public exception-heavy qualifiers.
- Keep runtime billing integration untouched in this pass.
- Use provider-neutral public wording such as "authorised payment partner", "Merchant of Record shown at checkout", and "billing portal".
- Make monthly and annual subscriptions the primary paid path; founder remains secondary and uses the canonical 200-seat cap.

## Acceptance Criteria
1. `/refunds`, `/terms`, pricing, FAQ, help, billing, founder-supporter, and public machine-readable content all align on a simple 14-day refund window.
2. No public-facing copy says founder purchases are final sale, non-refundable, or excluded from the refund policy.
3. Public/legal copy no longer names Lemon Squeezy unless the wording is implementation-only and not customer-facing.
4. Public payment acquisition copy no longer says provider approval is pending or labels paid CTAs as "coming soon".
5. Support and billing contact paths are visible and written in customer language.
