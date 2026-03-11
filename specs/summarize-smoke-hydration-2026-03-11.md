# Summarize Smoke Hydration Stabilization

## Goal
Make the verified `/summarize` smoke path deterministic after the layout changes so Playwright waits for one hydrated composer instead of tripping over transient duplicate nodes.

## Problem
The summarize smoke test was the last failing release gate after the layout work. At runtime, the summarize composer could briefly appear twice during navigation/hydration, which made the strict `getByTestId("summary-input")` assertion fail even though the stable page settled to a single visible composer.

## Scope
- Add one shared Playwright helper that opens `/summarize`, waits for exactly one composer node, and then waits for React hydration.
- Reuse that helper in summarize-related smoke flows instead of asserting on the raw route transition immediately.

## Acceptance criteria
- The summarize smoke and limits smoke paths use the shared summarize-page helper.
- The helper waits for one `summary-input` node before interacting.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
