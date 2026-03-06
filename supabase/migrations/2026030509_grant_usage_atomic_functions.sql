-- Grant atomic usage helpers to authenticated and service-role API callers.
grant execute on function
  increment_usage_daily_atomic(uuid, date, int),
  increment_lifetime_free_atomic(uuid, int)
to authenticated, service_role;
