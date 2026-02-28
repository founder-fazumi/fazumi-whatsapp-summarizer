-- Lemon Squeezy webhook verification snippets
-- Fixture ids used by the replay harness:
--   order_created_founder.json         -> order_test_founder_001
--   subscription_payment_success.json  -> sub_test_monthly_001
--   subscription_updated_active.json   -> sub_test_monthly_001

-- 1) Confirm the unique index exists on subscriptions.ls_order_id
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'subscriptions'
  and indexname = 'subscriptions_ls_order_id_unique';

-- 2) Confirm there are no duplicate Lemon Squeezy order ids
select
  ls_order_id,
  count(*) as row_count
from public.subscriptions
where ls_order_id is not null
group by ls_order_id
having count(*) > 1;

-- 3) After replaying order_created_founder twice, confirm idempotency:
--    expected row_count = 1 for order_test_founder_001
select
  ls_order_id,
  count(*) as row_count
from public.subscriptions
where ls_order_id = 'order_test_founder_001'
group by ls_order_id;

-- 4) After replaying subscription_payment_success, confirm the recurring row
--    is active and the new period end was applied.
select
  user_id,
  ls_subscription_id,
  plan_type,
  status,
  current_period_end,
  updated_at
from public.subscriptions
where ls_subscription_id = 'sub_test_monthly_001';

-- Expect:
--   status = 'active'
--   current_period_end = '2026-04-01 00:00:00+00'

-- 5) Put the recurring fixture row into past_due, then open /billing and
--    confirm the red payment-failed warning appears.
update public.subscriptions
set
  status = 'past_due',
  updated_at = now()
where ls_subscription_id = 'sub_test_monthly_001';

select
  user_id,
  ls_subscription_id,
  status,
  current_period_end,
  updated_at
from public.subscriptions
where ls_subscription_id = 'sub_test_monthly_001';

-- 6) Replay subscription_updated_active.json to clear the warning again.
--    The row above should return to status = 'active'.
