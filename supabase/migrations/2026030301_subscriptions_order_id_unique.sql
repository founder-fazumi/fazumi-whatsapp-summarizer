-- Dedupe replayed Founder orders before enforcing uniqueness on the Lemon Squeezy order id.
with ranked as (
  select
    id,
    row_number() over (
      partition by ls_order_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.subscriptions
  where ls_order_id is not null
)
delete from public.subscriptions as subscriptions
using ranked
where subscriptions.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists subscriptions_ls_order_id_unique
  on public.subscriptions (ls_order_id);
