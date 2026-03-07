create table if not exists public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_key text not null,
  group_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, group_key)
);

create table if not exists public.processed_message_fingerprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  msg_fingerprint text not null,
  msg_ts timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, group_id, msg_fingerprint)
);

create table if not exists public.group_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  state_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, group_id)
);

create index if not exists chat_groups_user_id_idx
  on public.chat_groups (user_id, updated_at desc);

create index if not exists processed_message_fingerprints_group_id_idx
  on public.processed_message_fingerprints (group_id, msg_ts desc);

create index if not exists processed_message_fingerprints_user_id_idx
  on public.processed_message_fingerprints (user_id, created_at desc);

create index if not exists group_state_user_id_idx
  on public.group_state (user_id, updated_at desc);

alter table public.chat_groups enable row level security;
alter table public.processed_message_fingerprints enable row level security;
alter table public.group_state enable row level security;

drop policy if exists "chat_groups_select_own_or_admin" on public.chat_groups;
create policy "chat_groups_select_own_or_admin"
  on public.chat_groups
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

drop policy if exists "chat_groups_insert_own" on public.chat_groups;
create policy "chat_groups_insert_own"
  on public.chat_groups
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "chat_groups_update_own_or_admin" on public.chat_groups;
create policy "chat_groups_update_own_or_admin"
  on public.chat_groups
  for update
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

drop policy if exists "processed_message_fingerprints_select_own_or_admin" on public.processed_message_fingerprints;
create policy "processed_message_fingerprints_select_own_or_admin"
  on public.processed_message_fingerprints
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

drop policy if exists "processed_message_fingerprints_insert_own" on public.processed_message_fingerprints;
create policy "processed_message_fingerprints_insert_own"
  on public.processed_message_fingerprints
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "group_state_select_own_or_admin" on public.group_state;
create policy "group_state_select_own_or_admin"
  on public.group_state
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

drop policy if exists "group_state_insert_own" on public.group_state;
create policy "group_state_insert_own"
  on public.group_state
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "group_state_update_own_or_admin" on public.group_state;
create policy "group_state_update_own_or_admin"
  on public.group_state
  for update
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

alter table public.summaries
  add column if not exists group_id uuid references public.chat_groups(id) on delete set null,
  add column if not exists source_kind text not null default 'text',
  add column if not exists source_range text,
  add column if not exists new_messages_count integer;

update public.summaries
set source_kind = 'text'
where source_kind is null;

alter table public.summaries
  alter column source_kind set default 'text',
  alter column source_kind set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'summaries_source_kind_check'
  ) then
    alter table public.summaries
      add constraint summaries_source_kind_check
      check (source_kind in ('text', 'zip'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'summaries_source_range_check'
  ) then
    alter table public.summaries
      add constraint summaries_source_range_check
      check (source_range is null or source_range in ('24h', '7d'));
  end if;
end $$;

create index if not exists summaries_group_id_idx
  on public.summaries (group_id, created_at desc);

