-- ─────────────────────────────────────────────────────────────
-- Fazumi: usage_daily table
-- Tracks summarize API calls per user per calendar day.
-- Writes are done via service role key only (no user-write policy).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.usage_daily (
  user_id        uuid not null references auth.users(id) on delete cascade,
  date           date not null default current_date,
  summaries_used int  not null default 0,
  primary key (user_id, date)
);

-- Row-level security
alter table public.usage_daily enable row level security;

create policy "usage_daily: own rows read"
  on public.usage_daily for select
  using (auth.uid() = user_id);

-- No insert/update policy for users — all writes go through
-- the service role key in the API route (bypasses RLS).
