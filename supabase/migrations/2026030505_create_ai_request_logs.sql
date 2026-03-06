create extension if not exists pgcrypto;

create table if not exists public.ai_request_logs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete set null,
  route               text not null default '/api/summarize',
  model               text not null default 'gpt-4o-mini',
  status              text not null default 'success' check (status in ('success', 'error')),
  input_chars         int not null default 0,
  prompt_tokens       int not null default 0,
  completion_tokens   int not null default 0,
  total_tokens        int not null default 0,
  estimated_cost_usd  numeric(12, 6) not null default 0,
  latency_ms          int not null default 0,
  error_code          text,
  created_at          timestamptz not null default now()
);

create index if not exists ai_request_logs_created_at_idx
  on public.ai_request_logs (created_at desc);

create index if not exists ai_request_logs_status_idx
  on public.ai_request_logs (status);

create index if not exists ai_request_logs_user_id_idx
  on public.ai_request_logs (user_id);

alter table public.ai_request_logs enable row level security;
