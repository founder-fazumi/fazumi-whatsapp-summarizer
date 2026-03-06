create extension if not exists pgcrypto;

alter table if exists public.user_feedback
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists type text not null default 'support',
  add column if not exists status text not null default 'pending',
  add column if not exists priority text,
  add column if not exists response text,
  add column if not exists responded_at timestamptz;

update public.user_feedback
set type = coalesce(nullif(type, ''), 'support'),
    status = coalesce(nullif(status, ''), 'pending')
where type is null or status is null;

alter table public.user_feedback
  drop constraint if exists user_feedback_type_check,
  drop constraint if exists user_feedback_status_check,
  drop constraint if exists user_feedback_priority_check;

alter table public.user_feedback
  add constraint user_feedback_type_check
    check (type in ('bug', 'feature', 'complaint', 'praise', 'support')),
  add constraint user_feedback_status_check
    check (status in ('pending', 'reviewed', 'resolved', 'rejected')),
  add constraint user_feedback_priority_check
    check (priority is null or priority in ('low', 'medium', 'high', 'critical'));

create index if not exists user_feedback_user_id_idx
  on public.user_feedback (user_id);

create index if not exists user_feedback_status_idx
  on public.user_feedback (status);

create index if not exists user_feedback_created_at_idx
  on public.user_feedback (created_at desc);

alter table public.user_feedback enable row level security;

drop policy if exists "user_feedback: admin select" on public.user_feedback;
create policy "user_feedback: admin select"
  on public.user_feedback for select
  using (true);

drop policy if exists "user_feedback: own insert" on public.user_feedback;
create policy "user_feedback: own insert"
  on public.user_feedback for insert
  with check (auth.uid() = user_id or user_id is null);
