create table if not exists public.user_consents (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade,
  ip_address       inet not null,
  user_agent       text not null,
  consent_version  text not null default '1.0',
  analytics        boolean not null default false,
  session_replay   boolean not null default false,
  marketing        boolean not null default false,
  withdrawn_at     timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists user_consents_user_id_idx
  on public.user_consents (user_id);

create index if not exists user_consents_created_at_idx
  on public.user_consents (created_at desc);

alter table public.user_consents enable row level security;

drop policy if exists "user_consents: own select" on public.user_consents;
create policy "user_consents: own select"
  on public.user_consents for select
  using (auth.uid() = user_id);

drop policy if exists "user_consents: own insert" on public.user_consents;
create policy "user_consents: own insert"
  on public.user_consents for insert
  with check (auth.uid() = user_id or user_id is null);

-- Rollback note:
-- drop table if exists public.user_consents cascade;
