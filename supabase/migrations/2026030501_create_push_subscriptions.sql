create table if not exists public.push_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  endpoint         text not null unique,
  subscription     jsonb not null,
  timezone         text,
  user_agent       text,
  last_notified_at timestamptz,
  last_error       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

create index if not exists push_subscriptions_timezone_idx
  on public.push_subscriptions (timezone);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions: own select" on public.push_subscriptions;
create policy "push_subscriptions: own select"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions: own delete" on public.push_subscriptions;
create policy "push_subscriptions: own delete"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- Rollback note:
-- drop table if exists public.push_subscriptions cascade;
