-- ─────────────────────────────────────────────────────────────
-- Fazumi: profiles table
-- One row per auth.users row, auto-created by trigger on signup.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id                 uuid        primary key references auth.users(id) on delete cascade,
  full_name          text,
  avatar_url         text,
  plan               text        not null default 'free',
    -- Allowed values: 'free' | 'monthly' | 'annual' | 'founder'
  trial_expires_at   timestamptz default (now() + interval '7 days'),
  lifetime_free_used int         not null default 0,
  lang_pref          text        not null default 'en',
    -- Allowed values: 'en' | 'ar'
  theme_pref         text        not null default 'light',
    -- Allowed values: 'light' | 'dark'
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Row-level security
alter table public.profiles enable row level security;

drop policy if exists "profiles: own row read" on public.profiles;
create policy "profiles: own row read"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: own row update" on public.profiles;
create policy "profiles: own row update"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
