create extension if not exists pgcrypto;

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null,
  created_at timestamptz not null default now(),
  message text not null,
  meta_json jsonb
);

create index if not exists user_feedback_phone_created_idx
  on public.user_feedback (phone_e164, created_at desc);
