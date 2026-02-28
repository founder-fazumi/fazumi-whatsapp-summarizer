-- summaries table: stores structured output only; raw chat text is NEVER stored
create table if not exists public.summaries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  title            text not null,              -- first line of TL;DR, max 60 chars
  tldr             text not null,
  important_dates  jsonb not null default '[]',
  action_items     jsonb not null default '[]',
  people_classes   jsonb not null default '[]',
  links            jsonb not null default '[]',
  questions        jsonb not null default '[]',
  char_count       int  not null default 0,
  lang_detected    text not null default 'en'
);

-- RLS: users can only see and modify their own rows
alter table public.summaries enable row level security;

create policy "summaries: own select"
  on public.summaries for select
  using (auth.uid() = user_id and deleted_at is null);

create policy "summaries: own insert"
  on public.summaries for insert
  with check (auth.uid() = user_id);

create policy "summaries: own update"
  on public.summaries for update
  using (auth.uid() = user_id);

-- Rollback note:
-- drop table if exists public.summaries cascade;
