# Supabase Patterns — Fazumi Backend

## Client selection quick reference

```typescript
// ── Server Component or API route (auth-aware) ──────────────────
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// ── API route admin write (bypass RLS) ─────────────────────────
import { createClient as createAdminClient } from "@supabase/supabase-js";
const admin = createAdminClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Client Component ───────────────────────────────────────────
import { createClient } from "@/lib/supabase/client";
const supabase = createClient(); // call once at module scope
```

## RLS policy templates

### Read-own-rows
```sql
create policy "own rows read" on public.<table>
  for select using (auth.uid() = user_id);
```

### Read + write own rows
```sql
create policy "own rows read" on public.<table>
  for select using (auth.uid() = user_id);
create policy "own rows insert" on public.<table>
  for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.<table>
  for update using (auth.uid() = user_id);
```

### Service-role-only writes (no user write policy)
```sql
-- Enable RLS but no insert/update policy for users.
-- Service role bypasses RLS entirely.
alter table public.<table> enable row level security;
create policy "own rows read" on public.<table>
  for select using (auth.uid() = user_id);
-- Writes only via admin client (service role key).
```

## Migration file naming
```
supabase/migrations/<YYYYMMDD>_<description>.sql
```
Example: `20260301_create_profiles.sql`

## Profile auto-creation trigger (already deployed)
The `handle_new_user()` trigger fires on `auth.users INSERT` and creates a
`public.profiles` row with `id`, `full_name`, `avatar_url` from OAuth metadata.
Do NOT create profiles manually in API routes — the trigger handles it.

## Common query patterns

### Fetch own profile
```typescript
const { data: profile } = await supabase
  .from("profiles")
  .select("plan, trial_expires_at, lifetime_free_used, lang_pref, theme_pref")
  .eq("id", user.id)
  .single();
```

### Today's usage
```typescript
const today = new Date().toISOString().slice(0, 10);
const { data: usage } = await supabase
  .from("usage_daily")
  .select("summaries_used")
  .eq("user_id", user.id)
  .eq("date", today)
  .maybeSingle(); // returns null if no row yet (first use today)
```

### Upsert daily usage (admin client required — bypasses RLS)
```typescript
await admin.from("usage_daily").upsert(
  { user_id: user.id, date: today, summaries_used: (usage?.summaries_used ?? 0) + 1 },
  { onConflict: "user_id,date" }
);
```

### Update profile preferences
```typescript
await admin.from("profiles")
  .update({ lang_pref: "ar", updated_at: new Date().toISOString() })
  .eq("id", user.id);
```

## Plan status helper
```typescript
function getPlanStatus(profile: Profile) {
  const isPaid = ["monthly", "annual", "founder"].includes(profile.plan);
  const isTrialActive = profile.trial_expires_at
    ? new Date(profile.trial_expires_at) > new Date()
    : false;
  const isLifetimeFreeAvailable = !isPaid && !isTrialActive && profile.lifetime_free_used < 3;
  return { isPaid, isTrialActive, isLifetimeFreeAvailable };
}
```
