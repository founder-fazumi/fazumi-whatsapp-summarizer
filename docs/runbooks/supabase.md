# Runbook: Supabase Operations

**Skill:** `/backend-dev`
**Last updated:** 2026-03-01

---

## Key tables

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | One row per auth user | plan, trial_expires_at, lifetime_free_used, referral_code |
| `summaries` | Structured summary output | tldr, important_dates, action_items, people_classes, links, questions, char_count, lang_detected |
| `usage_daily` | Daily summarize counter | user_id, date, summaries_used |
| `subscriptions` | LS subscription state | ls_subscription_id (UNIQUE), ls_order_id (UNIQUE INDEX), plan_type, status |

---

## Migrations workflow

```powershell
# Push all local migrations to production Supabase
supabase db push --include-all

# If "reverted" phantom entries appear for old migrations:
supabase migration repair --status reverted 20260213 20260301 20260303
```

Migration files: `supabase/migrations/<timestamp>_<description>.sql`
Timestamp format: `YYYYMMDD` (8 digits) + sequence if multiple on same day.

All migrations must be idempotent (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`).

---

## RLS policies (expected)

| Table | Users can | Service role can |
|---|---|---|
| `profiles` | SELECT own row | SELECT, INSERT, UPDATE |
| `summaries` | SELECT, INSERT own rows | All |
| `usage_daily` | SELECT own rows | All (upsert on summarize) |
| `subscriptions` | SELECT own rows | All (upsert on webhook) |

Test RLS in Supabase SQL editor:
```sql
-- Simulate user query
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"<user-uuid>"}';
SELECT * FROM public.summaries;
-- Should return only rows where user_id = <user-uuid>
```

---

## Profile auto-create trigger

New user → `handle_new_user()` trigger → profile row with:
- `plan = 'free'`
- `trial_expires_at = now() + interval '7 days'`
- `referral_code = nanoid(8)`

Verify trigger exists:
```sql
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'users' AND trigger_name = 'on_auth_user_created';
```

---

## MCP usage policy

Supabase MCP is configured **read-only** in `.claude/settings.json`:
- Use for: schema verification, table inspection, query checks
- Never use for: write operations, migration execution, RLS changes
- Never send raw chat text or user emails in MCP queries

---

## Common issues

| Issue | Fix |
|---|---|
| Profile not created after signup | Check `on_auth_user_created` trigger exists + function `handle_new_user()` |
| summaries not appearing for user | Check RLS SELECT policy on `summaries` table |
| usage_daily not incrementing | Check service role key used in API route; upsert with `onConflict: "user_id,date"` |
| Migration fails on push | Check for duplicate table/policy names; ensure migration is idempotent |
| "row not found" after upsert | Check `onConflict` column matches the actual UNIQUE constraint |

---

## Supabase MCP query examples (read-only)

```sql
-- Verify columns on summaries (confirm no raw_text column)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'summaries'
ORDER BY ordinal_position;

-- Verify subscriptions unique constraints
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.subscriptions'::regclass;

-- Latest summaries (metadata only)
SELECT id, char_count, lang_detected, created_at
FROM public.summaries
ORDER BY created_at DESC LIMIT 5;
```
