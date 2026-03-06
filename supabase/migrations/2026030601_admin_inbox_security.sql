create extension if not exists pgcrypto;

alter table if exists public.profiles
  add column if not exists role text not null default 'user';

update public.profiles
set role = 'user'
where role is null or role not in ('user', 'admin');

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
    check (role in ('user', 'admin'));

create index if not exists profiles_role_idx
  on public.profiles (role);

drop policy if exists "profiles: own row update" on public.profiles;

alter table if exists public.user_feedback
  add column if not exists email text,
  add column if not exists subject text,
  add column if not exists locale text not null default 'en',
  add column if not exists rating text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists admin_notes text,
  add column if not exists last_updated_at timestamptz not null default now();

update public.user_feedback
set
  status = case
    when status = 'pending' then 'new'
    when status = 'reviewed' then 'in_progress'
    when status = 'rejected' then 'closed'
    when status is null or status = '' then 'new'
    else status
  end,
  priority = case
    when priority = 'medium' then 'normal'
    when priority is null or priority = '' then 'normal'
    else priority
  end,
  subject = coalesce(nullif(subject, ''), left(message, 96)),
  locale = coalesce(nullif(locale, ''), 'en'),
  tags = coalesce(tags, '{}'),
  last_updated_at = coalesce(last_updated_at, now());

alter table public.user_feedback
  drop constraint if exists user_feedback_status_check,
  drop constraint if exists user_feedback_priority_check;

alter table public.user_feedback
  add constraint user_feedback_status_check
    check (status in ('new', 'in_progress', 'resolved', 'closed')),
  add constraint user_feedback_priority_check
    check (priority is null or priority in ('low', 'normal', 'high', 'critical')),
  add constraint user_feedback_locale_check
    check (locale in ('en', 'ar'));

create index if not exists user_feedback_status_priority_idx
  on public.user_feedback (status, priority);

create index if not exists user_feedback_locale_idx
  on public.user_feedback (locale);

create index if not exists user_feedback_last_updated_at_idx
  on public.user_feedback (last_updated_at desc);

create index if not exists user_feedback_tags_idx
  on public.user_feedback using gin (tags);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  phone_e164 text,
  subject text not null,
  message text not null,
  locale text not null default 'en',
  status text not null default 'new',
  priority text not null default 'normal',
  tags text[] not null default '{}',
  admin_notes text
);

alter table public.support_requests enable row level security;

alter table public.support_requests
  drop constraint if exists support_requests_locale_check,
  drop constraint if exists support_requests_status_check,
  drop constraint if exists support_requests_priority_check,
  add constraint support_requests_locale_check
    check (locale in ('en', 'ar')),
  add constraint support_requests_status_check
    check (status in ('new', 'in_progress', 'resolved', 'closed')),
  add constraint support_requests_priority_check
    check (priority in ('low', 'normal', 'high', 'critical'));

create index if not exists support_requests_created_at_idx
  on public.support_requests (created_at desc);

create index if not exists support_requests_last_updated_at_idx
  on public.support_requests (last_updated_at desc);

create index if not exists support_requests_status_priority_idx
  on public.support_requests (status, priority);

create index if not exists support_requests_locale_idx
  on public.support_requests (locale);

create index if not exists support_requests_user_id_idx
  on public.support_requests (user_id);

create index if not exists support_requests_tags_idx
  on public.support_requests using gin (tags);

create table if not exists public.webhook_delivery_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider text not null,
  event_name text,
  external_id text,
  user_id uuid references auth.users(id) on delete set null,
  request_id text,
  status text not null default 'processed',
  http_status integer,
  error_code text,
  error_message text
);

alter table public.webhook_delivery_log enable row level security;

alter table public.webhook_delivery_log
  drop constraint if exists webhook_delivery_log_status_check,
  add constraint webhook_delivery_log_status_check
    check (status in ('processed', 'failed', 'rejected'));

create index if not exists webhook_delivery_log_created_at_idx
  on public.webhook_delivery_log (created_at desc);

create index if not exists webhook_delivery_log_status_idx
  on public.webhook_delivery_log (status);

create index if not exists webhook_delivery_log_provider_idx
  on public.webhook_delivery_log (provider, created_at desc);

create or replace function public.touch_last_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.last_updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_user_feedback_last_updated_at on public.user_feedback;
create trigger touch_user_feedback_last_updated_at
  before update on public.user_feedback
  for each row
  execute function public.touch_last_updated_at();

drop trigger if exists touch_support_requests_last_updated_at on public.support_requests;
create trigger touch_support_requests_last_updated_at
  before update on public.support_requests
  for each row
  execute function public.touch_last_updated_at();
