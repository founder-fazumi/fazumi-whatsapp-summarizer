## Summarize Inline Results Assistant

Date: 2026-03-11
Route: `/summarize`

### Goal
Make FAZUMI feel like a personalized school-message assistant by showing the generated summary immediately below the paste box, widening the result area, and surfacing the next-step actions and follow-up questions more prominently.

### Scope
- Keep the existing summarize APIs, auth flow, summary schema, and existing `data-testid` selectors intact.
- Keep the paste-first workflow as the primary entry point.
- Preserve privacy messaging and the rule that raw chat text is not stored.

### Required changes
- Replace the narrow `max-w-2xl` summarize shell with a wider layout that uses more desktop width.
- Keep the paste composer as the primary surface and render the summary block directly below it so users do not need to scroll past setup cards to read the result.
- Move output-language, source/group setup, and ZIP import into secondary support cards that no longer push the summary lower in the page.
- Make summary actions feel more immediate and useful for parents by keeping export/share, todo, and calendar actions prominent in the result surface.
- Upgrade the follow-up panel into a more parent-aware FAZUMI assistant panel with `BETA` treatment and school-parent-centric prompts derived from the current `SummaryResult`.

### Acceptance criteria
- On `/summarize`, the first generated summary appears immediately below the paste card.
- Desktop layout uses noticeably more horizontal space, and summary text/cards are less cramped.
- Setup and ZIP controls remain available without blocking the first-view summary.
- Summary action buttons remain functional and visible in the result card.
- The follow-up panel renders with `BETA` copy, feels assistant-like, stays RTL-safe, and makes no additional API call.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass after the redesign.
