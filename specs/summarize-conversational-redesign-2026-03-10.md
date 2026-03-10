## Summarize Conversational Redesign

Date: 2026-03-10
Route: `/summarize`

### Goal
Make the summarize flow feel like a conversational AI tool instead of a long dashboard form.

### Scope
- Keep the existing summarize APIs, auth flow, and analytics events unchanged.
- Keep all existing `data-testid` attributes unchanged.
- Preserve the existing summary output and summary action behavior.

### Required changes
- Narrow the summarize shell to `max-w-2xl` and lighten the top paste card spacing.
- Change summary scrolling from smooth to instant.
- Remove the Memory + Autopilot card block from the summarize page.
- Add a small saved-memory indicator above the main input card when family memory exists.
- Add a new dismissible follow-up panel below `SummaryDisplay` that derives 3-4 questions from the existing `SummaryResult` only.

### Acceptance criteria
- `/summarize` no longer shows the Memory or Autopilot card section.
- After submit, the page snaps directly to the summary area.
- `SummaryDisplay` remains unchanged in behavior, and the saved banner stays above it.
- The new follow-up panel renders below the summary, shows a visible `BETA` badge, expands inline answers, and supports Arabic RTL.
- The follow-up panel makes no API calls and uses only the already loaded summary payload.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass after the redesign.
