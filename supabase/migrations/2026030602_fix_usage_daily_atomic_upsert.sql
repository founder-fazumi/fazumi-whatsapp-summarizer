-- Ensure daily usage increments are atomic even when the row is created
-- under concurrent summarize requests.
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
  insert into usage_daily (user_id, date, summaries_used)
  values (p_user_id, p_date, p_increment)
  on conflict (user_id, date)
  do update
  set summaries_used = usage_daily.summaries_used + excluded.summaries_used
  returning summaries_used into v_new_count;

  return v_new_count;
end;
$$;
