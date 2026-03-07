# Supabase RLS & Migrations — Fazumi Operations Guide

> Level 3 reference for `/backend-dev`. Also see `docs/runbooks/supabase.md`.

---

## Migration authoring rules

### File naming
```
supabase/migrations/<YYYYMMDD><seq>_<description>.sql
```
- `<YYYYMMDD>` = 8-digit date
- `<seq>` = optional 2-digit sequence for same-day migrations (01, 02, …)
- Timestamp-only filenames (no `_name`) are skipped by CLI v2.75.0+

### Idempotency — mandatory
Every migration must be safe to re-run:

```sql
-- Tables
CREATE TABLE IF NOT EXISTS public.<table> (...);

-- Functions
CREATE OR REPLACE FUNCTION ...

-- Policies (must drop before create)
DROP POLICY IF EXISTS "policy_name" ON public.<table>;
CREATE POLICY "policy_name" ON public.<table> ...;

-- Columns
ALTER TABLE public.<table>
  ADD COLUMN IF NOT EXISTS <col> <type>;

-- Indexes
CREATE INDEX IF NOT EXISTS <name> ON public.<table>(<col>);
```

### Push workflow (this repo)
```powershell
supabase db push --include-all
supabase migration repair --status reverted 20260213 20260301 20260303
```
The repair removes phantom entries the CLI recreates after `--include-all` for
migrations with prior reverted history. See `docs/runbooks/supabase.md` for full
explanation of the structural drift issue.

Pre-deploy dry-run:
```powershell
supabase db push --dry-run --include-all  # correct for this repo — exits 0
# bare --dry-run always fails (structural limitation, not an error)
```

---

## RLS policy templates

### Read-own-rows only (summaries, history)
```sql
alter table public.<table> enable row level security;

create policy "users_select_own" on public.<table>
  for select using (auth.uid() = user_id);
```

### Read + insert own rows (no user updates)
```sql
alter table public.<table> enable row level security;

create policy "users_select_own" on public.<table>
  for select using (auth.uid() = user_id);

create policy "users_insert_own" on public.<table>
  for insert with check (auth.uid() = user_id);
```

### Service-role writes only (subscriptions, usage_daily)
```sql
alter table public.<table> enable row level security;

-- Users can only read their own rows; service role bypasses RLS
create policy "users_select_own" on public.<table>
  for select using (auth.uid() = user_id);
-- No insert/update policy for users — admin client handles writes
```

---

## RLS verification (Supabase SQL editor — read-only MCP safe)

```sql
-- Test as an authenticated user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"<user-uuid>"}';
SELECT * FROM public.summaries;
-- Expected: only rows where user_id = <user-uuid>

-- Confirm policies exist
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = '<table>';

-- Confirm RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = '<table>';
```

---

## Upload security — Zip Slip guard

When processing `.zip` uploads (WhatsApp exports), always validate entry paths:

```typescript
import path from "path";

function isSafePath(entryName: string, extractDir: string): boolean {
  const resolved = path.resolve(extractDir, entryName);
  return resolved.startsWith(path.resolve(extractDir) + path.sep);
}

// During extraction loop:
for (const entry of zipEntries) {
  if (!isSafePath(entry.entryName, extractDir)) {
    throw new Error(`Zip Slip attempt: ${entry.entryName}`);
  }
  // only extract if safe
}
```

**Never** pass `entryName` directly to `fs.writeFileSync` or `path.join` without this check.

For Fazumi MVP: zip processing is in-memory (no disk writes), so the primary risk is
directory traversal in entry name inspection. Still validate before reading entry content.

---

## Sentry / logging safety for uploads

```typescript
// In error handlers for upload routes:
Sentry.withScope((scope) => {
  scope.setTag("route", "api/summarize");
  scope.setContext("upload", {
    fileType: file.type,          // safe: mime type
    fileSize: file.size,          // safe: number
    // NEVER: file content, file name from user, extracted text
  });
  Sentry.captureException(error);
});
```

`beforeSend` filter in `sentry.server.config.ts`:
```typescript
beforeSend(event) {
  // Strip request body — may contain raw chat text
  if (event.request) {
    delete event.request.data;
    delete event.request.headers?.["content-type"];
  }
  return event;
}
```

---

## Table quick-reference

| Table | RLS | Write path | Key columns |
|---|---|---|---|
| `profiles` | SELECT own | trigger + admin | plan, trial_expires_at, lifetime_free_used |
| `summaries` | SELECT + INSERT own | user JWT | tldr, important_dates, action_items, … |
| `usage_daily` | SELECT own | admin (service role) | user_id, date, summaries_used |
| `subscriptions` | SELECT own | admin (webhook handler) | ls_subscription_id, status, plan_type |
