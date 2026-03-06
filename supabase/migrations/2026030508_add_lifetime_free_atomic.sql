-- Fix P1: Make lifetime free usage increments atomic.
create or replace function increment_lifetime_free_atomic(
  p_user_id uuid,
  p_increment int default 1
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count int;
begin
  select lifetime_free_used + p_increment
  into v_new_count
  from profiles
  where id = p_user_id
  for update;

  update profiles
  set lifetime_free_used = v_new_count
  where id = p_user_id;

  return v_new_count;
end;
$$;
