# Spec - Support Contact Layout and Public Accordion Polish (2026-03-13)

## Context
- The post-Paddle copy pass left one support-contact layout bug on `/help`: support and billing email links render as adjacent inline text instead of clearly separated contact actions.
- Public FAQ-style accordions still manage each item with isolated local state, so multiple answers can stay open at once.
- This is a narrow UX follow-up only. Do not reopen the broader payment/legal/auth scope.

## Decision
- Render support and billing email links as clearly separated stacked actions anywhere the public UI presents both addresses together.
- Make the public FAQ/help/founder accordion surfaces behave as a standard single-open accordion with collapsible active items.
- Prefer one shared FAQ accordion implementation over page-by-page behavior patches.

## Acceptance Criteria
1. `/help` shows support and billing contact links with clear visual separation on mobile and desktop.
2. Any other reused public support/billing block with the same adjacent-link pattern is cleaned up in the same slice.
3. Public FAQ-style accordion surfaces close the previously open item when a new item opens.
4. Clicking the currently open FAQ item collapses it.
5. `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass after the patch.
