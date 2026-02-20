create or replace function public.ensure_phone_burst(
  p_phone_e164 text,
  p_received_at timestamptz default now(),
  p_burst_seconds integer default 6
)
returns table(anchor_received_at timestamptz, deadline_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_received_at timestamptz := coalesce(p_received_at, now());
  v_burst_seconds integer := greatest(coalesce(p_burst_seconds, 6), 1);
  v_candidate_deadline timestamptz := v_received_at + make_interval(secs => v_burst_seconds);
begin
  if coalesce(trim(p_phone_e164), '') = '' then
    return;
  end if;

  insert into public.phone_bursts (phone_e164, anchor_received_at, deadline_at, updated_at)
  values (
    p_phone_e164,
    v_received_at,
    v_candidate_deadline,
    v_now
  )
  on conflict (phone_e164)
  do update
    set anchor_received_at = case
      when public.phone_bursts.deadline_at <= v_now then excluded.anchor_received_at
      else public.phone_bursts.anchor_received_at
    end,
    deadline_at = case
      when public.phone_bursts.deadline_at <= v_now then excluded.deadline_at
      else greatest(public.phone_bursts.deadline_at, excluded.deadline_at)
    end,
    updated_at = v_now;

  return query
  select b.anchor_received_at, b.deadline_at
  from public.phone_bursts b
  where b.phone_e164 = p_phone_e164;
end;
$$;

grant execute on function public.ensure_phone_burst(text, timestamptz, integer) to service_role;
