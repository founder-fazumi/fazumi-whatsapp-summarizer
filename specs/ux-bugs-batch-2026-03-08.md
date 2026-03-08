# UX Bugs Batch (2026-03-08)

## Summary
Fix five scoped UI/UX issues in the dashboard experience without changing backend behavior, API route logic, or adding new services/pages.

## Scope
- Move the summarize page's primary textarea to the first visible position on load.
- Widen the summarize card on laptop screens only.
- Prevent stale dashboard-page content from flashing during route transitions.
- Make the language toggle clearly show both locale options on desktop.
- Keep the theme and language icons visible on small mobile widths.

## Constraints
- No architecture changes beyond the route-group wrapper needed for the dashboard template.
- No API route logic changes.
- Keep existing COPY keys intact.
- Verify with `pnpm lint` and `pnpm typecheck` after each implementation batch.

## Acceptance Criteria
1. `/summarize` loads with the textarea as the first visible element; the page title is a compact inline label inside the main card; the privacy note sits below the submit row.
2. `/summarize` uses `max-w-4xl` in its dashboard shell so the card is less cramped on laptop widths while mobile remains unchanged.
3. Navigating between dashboard routes fades in fresh content without showing stale page fragments from the previous route.
4. Desktop language toggles in the dashboard top bar and landing nav display `EN / عربي`, with the active locale visually emphasized.
5. On ~375px mobile widths, the top bar still shows the globe icon, theme icon, and avatar without horizontal overflow.
