create table if not exists public.phone_bursts (
  phone_e164 text primary key,
  anchor_received_at timestamptz not null,
  deadline_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_phone_bursts_deadline_at on public.phone_bursts (deadline_at);

create or replace function public.ensure_phone_burst(
  p_phone_e164 text,
  p_received_at timestamptz default now(),
  p_burst_seconds integer default 30
)
returns table(anchor_received_at timestamptz, deadline_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_received_at timestamptz := coalesce(p_received_at, now());
  v_burst_seconds integer := greatest(coalesce(p_burst_seconds, 30), 1);
begin
  if coalesce(trim(p_phone_e164), '') = '' then
    return;
  end if;

  insert into public.phone_bursts (phone_e164, anchor_received_at, deadline_at, updated_at)
  values (
    p_phone_e164,
    v_received_at,
    v_received_at + make_interval(secs => v_burst_seconds),
    v_now
  )
  on conflict (phone_e164)
  do update
    set anchor_received_at = case
      when v_now > public.phone_bursts.deadline_at then excluded.anchor_received_at
      else public.phone_bursts.anchor_received_at
    end,
    deadline_at = case
      when v_now > public.phone_bursts.deadline_at then excluded.deadline_at
      else public.phone_bursts.deadline_at
    end,
    updated_at = v_now;

  return query
  select b.anchor_received_at, b.deadline_at
  from public.phone_bursts b
  where b.phone_e164 = p_phone_e164;
end;
$$;

grant execute on function public.ensure_phone_burst(text, timestamptz, integer) to service_role;
