# Supabase Internal Table RLS Policy Follow-up (2026-03-12)

## Context
- Supabase linter findings still point at four internal tables in the exposed `public` schema:
  - `public.worker_phone_locks`
  - `public.phone_bursts`
  - `public.ai_request_logs`
  - `public.marketing_spend`
- Repo scan found no browser `supabase.from(...)` callsites for any of these tables.
- The archived WA worker still uses a service-role Supabase client and calls `claim_burst_leader`, but the repo does not contain that function's SQL definition. This slice therefore must not depend on changing the worker RPC contract.

## Current usage map

### `public.worker_phone_locks`
- Current callers: archived WA worker burst-leader flow
- Access path: service-role backend -> server-side RPC/helper flow -> table
- Direct browser or authenticated client access: none found
- Ownership columns: none

### `public.phone_bursts`
- Current callers: archived WA worker burst-leader flow
- Access path: service-role backend -> server-side RPC/helper flow -> table
- Direct browser or authenticated client access: none found
- Ownership columns: none

### `public.ai_request_logs`
- Current callers:
  - write: `lib/server/summaries.ts` logs AI usage with the service role
  - read: `lib/admin/queries.ts` aggregates admin AI usage data for admin pages and guarded admin API routes
- Access path: trusted server code only
- Direct browser or authenticated client access: none found
- Ownership columns: `user_id`, but there is no current end-user read requirement

### `public.marketing_spend`
- Current callers:
  - read/write: guarded admin income routes and server-side admin queries
- Access path: trusted server code only
- Direct browser or authenticated client access: none found
- Ownership columns: none

## Decision
- Treat all four tables as internal-only.
- Keep access via the service-role key and existing `SECURITY DEFINER` / RPC helper flows only.
- Add explicit deny-all policies so the fail-closed intent is visible in schema state instead of relying on implicit default-deny RLS.
- Do not add anon/authenticated allow policies unless a real browser or PostgREST use case is verified first.

## Non-goals
- No schema move out of `public` in this slice
- No archived WA worker rewrite
- No new Postgres admin-role model
- No browser access to any of the four tables

## Acceptance Criteria
1. A new migration enables RLS and installs explicit deny-all policies on `public.worker_phone_locks`, `public.phone_bursts`, `public.ai_request_logs`, and `public.marketing_spend`.
2. The migration does not add any anon/authenticated allow policy.
3. Existing service-role or helper-function access remains the only supported caller model.
4. `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
