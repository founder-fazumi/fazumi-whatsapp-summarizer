-- Fix P1: Make usage tracking atomic to prevent race conditions
-- Create atomic increment function for usage_daily.
create or replace function increment_usage_daily_atomic(
  p_user_id uuid,
  p_date date,
  p_increment int default 1
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count int;
begin
  -- Use FOR UPDATE to lock the row during read-modify-write
  select summaries_used + p_increment
  into v_new_count
  from usage_daily
  where user_id = p_user_id and date = p_date
  for update;

  -- If row doesn't exist, insert it
  if v_new_count is null then
    v_new_count := p_increment;
    insert into usage_daily (user_id, date, summaries_used)
    values (p_user_id, p_date, v_new_count);
  else
    -- Update with the new count
    update usage_daily
    set summaries_used = v_new_count
    where user_id = p_user_id and date = p_date;
  end if;

  return v_new_count;
end;
$$;
