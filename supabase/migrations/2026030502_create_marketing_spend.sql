create table if not exists public.marketing_spend (
  id         uuid primary key default gen_random_uuid(),
  month      date not null,
  channel    text not null default 'organic',
  amount     numeric(12, 2) not null check (amount >= 0),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_spend_month_idx
  on public.marketing_spend (month desc);

create index if not exists marketing_spend_channel_idx
  on public.marketing_spend (channel);

alter table public.marketing_spend enable row level security;

-- Service-role access only. Do not add public RLS policies here.

-- Rollback note:
-- drop table if exists public.marketing_spend cascade;
