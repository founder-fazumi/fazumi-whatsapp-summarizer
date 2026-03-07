alter table public.profiles
  add column if not exists family_context jsonb not null default '{}'::jsonb,
  add column if not exists summary_retention_days int null;

create table if not exists public.pmf_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  response text not null,
  biggest_benefit text,
  missing_if_gone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.pmf_responses
  enable row level security;

alter table public.pmf_responses
  drop constraint if exists pmf_responses_response_check,
  add constraint pmf_responses_response_check
    check (response in ('very_disappointed', 'somewhat_disappointed', 'not_disappointed'));

create index if not exists pmf_responses_user_id_idx
  on public.pmf_responses (user_id);

drop policy if exists "pmf_responses: own select" on public.pmf_responses;
create policy "pmf_responses: own select"
  on public.pmf_responses for select
  using (auth.uid() = user_id);

drop policy if exists "pmf_responses: own insert" on public.pmf_responses;
create policy "pmf_responses: own insert"
  on public.pmf_responses for insert
  with check (auth.uid() = user_id);

drop policy if exists "pmf_responses: own update" on public.pmf_responses;
create policy "pmf_responses: own update"
  on public.pmf_responses for update
  using (auth.uid() = user_id);
