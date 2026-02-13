create table if not exists public.worker_phone_locks (
  phone_e164 text primary key,
  lock_until timestamptz not null,
  lock_owner text not null,
  updated_at timestamptz not null default now()
);

create or replace function public.try_claim_worker_phone_lock(
  p_phone_e164 text,
  p_lock_owner text,
  p_lock_seconds integer default 45
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seconds integer := greatest(coalesce(p_lock_seconds, 45), 5);
begin
  if coalesce(trim(p_phone_e164), '') = '' then
    return false;
  end if;
  if coalesce(trim(p_lock_owner), '') = '' then
    return false;
  end if;

  insert into public.worker_phone_locks (phone_e164, lock_until, lock_owner, updated_at)
  values (p_phone_e164, now() + make_interval(secs => v_seconds), p_lock_owner, now())
  on conflict (phone_e164)
  do update
    set lock_until = now() + make_interval(secs => v_seconds),
        lock_owner = excluded.lock_owner,
        updated_at = now()
  where public.worker_phone_locks.lock_until < now()
     or public.worker_phone_locks.lock_owner = excluded.lock_owner;

  return exists (
    select 1
    from public.worker_phone_locks l
    where l.phone_e164 = p_phone_e164
      and l.lock_owner = p_lock_owner
      and l.lock_until > now()
  );
end;
$$;

create or replace function public.release_worker_phone_lock(
  p_phone_e164 text,
  p_lock_owner text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  delete from public.worker_phone_locks
  where phone_e164 = p_phone_e164
    and lock_owner = p_lock_owner
  returning true;
$$;

grant execute on function public.try_claim_worker_phone_lock(text, text, integer) to service_role;
grant execute on function public.release_worker_phone_lock(text, text) to service_role;
