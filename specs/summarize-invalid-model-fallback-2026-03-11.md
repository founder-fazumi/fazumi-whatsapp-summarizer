# Summarize invalid-model fallback + Vercel env correction (2026-03-11)

## Context
- `https://fazumi.com/` and `https://fazumi.com/summarize` were still failing after the 2026-03-10 request-shape hotfix.
- Live production verification against `POST /api/demo/summarize` reproduced the same 500 response seen by users.
- Vercel production logs showed the real server-side error: `Error: 400 invalid model ID`.
- The shared summarize flow already defaulted to `gpt-4o-mini`, but a bad `OPENAI_MODEL` environment value could still take down both the landing demo and authenticated summarize path at once.

## Decision
- Keep the shared Chat Completions summarize flow.
- Add one shared retry guard: if OpenAI rejects the configured summarize model with `invalid model ID`, retry once with the known-safe default `gpt-4o-mini`.
- Record the fallback in server logs and usage metadata using the actual model that produced the summary.
- Correct the Vercel production `OPENAI_MODEL` value to `gpt-4o-mini` and redeploy after the code guard is in place.

## Non-goals
- No broad Responses API migration in this slice.
- No new persistence or logging of raw chat text.
- No redesign of `/api/health`; this slice focuses on keeping summarize available even when the model env drifts.

## Acceptance Criteria
1. `lib/ai/openai-chat.ts` retries exactly once with `gpt-4o-mini` when the configured summarize model fails with `invalid model ID`.
2. Both text summarize and ZIP summarize use the shared fallback helper and record the actual model used in usage metadata.
3. `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass locally.
4. After redeploy, a live `POST https://fazumi.com/api/demo/summarize` returns summary JSON instead of the generic 500 error.
