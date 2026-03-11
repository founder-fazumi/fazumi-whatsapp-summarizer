# Supabase RLS Hardening For Legacy Phone-Burst Tables

## Goal
Remove the Supabase `rls_disabled_in_public` errors for the legacy phone-burst coordination tables without changing their existing server-side helper behavior.

## Problem
`public.worker_phone_locks` and `public.phone_bursts` live in the exposed `public` schema, but they were created without row level security. Supabase therefore flags them as externally exposed tables even though the intended access path is only through server-side `SECURITY DEFINER` functions and the `service_role`.

## Best-practice direction
- Any table in the exposed `public` schema must enable RLS, even if it is not user-facing.
- Internal coordination tables should fail closed for client roles.
- Legacy helper functions should keep working without a schema move or a WA-bot redesign.

## Scope
- Add one idempotent corrective migration for `public.worker_phone_locks` and `public.phone_bursts`.
- Enable RLS on both tables and keep direct client access denied.
- Leave the existing helper functions and archived WA-bot workflow unchanged.

## Acceptance criteria
- A new Supabase migration enables RLS on `public.worker_phone_locks`.
- A new Supabase migration enables RLS on `public.phone_bursts`.
- Direct client access to both tables fails closed under PostgREST.
- Existing `SECURITY DEFINER` / `service_role` helper access remains intact.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
