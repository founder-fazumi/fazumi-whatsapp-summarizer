# Summarize Mobile Quick Options

## Goal
Keep `/summarize` paste-first on smaller screens by exposing the essential pre-submit controls directly under the chat composer instead of letting the stacked support rail push them below the generated summary.

## Problem
The inline-result redesign fixed desktop hierarchy, but under the `xl` breakpoint the support rail still collapsed beneath the result. Parents on mobile/tablet had to scroll past the summary again to reach output-language and source controls that matter before submitting.

## Best-practice direction
- Preserve one dominant primary task and result path.
- Use progressive disclosure for secondary setup controls when screen space shrinks.
- Avoid repeating large support cards when a compact control surface near the primary input can do the same job.

## Scope
- Add a compact quick-options accordion under the paste textarea for smaller screens.
- Include summary-language and chat-source controls in that accordion.
- Hide the duplicated output-language support card below `xl`.
- Keep the lower setup card focused on saved-group organization outside desktop layouts.

## Acceptance criteria
- On viewports below `xl`, users can change summary language and chat source without leaving the paste card.
- The generated summary still appears immediately below the composer after submit.
- Desktop keeps the wider two-zone layout and support rail behavior from the inline-result redesign.
- `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass.
- `pnpm test` is attempted and any remaining blocker is recorded explicitly.
