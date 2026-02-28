-- subscriptions table: written only by webhook handler (service role)
create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  ls_subscription_id   text unique,           -- null for one-time orders (founder LTD)
  ls_order_id          text,
  plan_type            text not null,          -- monthly | annual | founder
  status               text not null default 'active',  -- active | cancelled | expired | past_due
  current_period_end   timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Users can read their own subscription; writes are service-role only
create policy "subscriptions: own select"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Rollback note:
-- drop table if exists public.subscriptions cascade;
