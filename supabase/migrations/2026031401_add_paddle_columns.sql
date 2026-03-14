-- Additive only: Paddle columns alongside existing ls_* columns.
-- paddle_occurred_at stores the Paddle event timestamp for ordering protection.
alter table public.subscriptions
  add column if not exists paddle_subscription_id text,
  add column if not exists paddle_transaction_id  text,
  add column if not exists paddle_customer_id     text,
  add column if not exists paddle_management_url  text,
  add column if not exists paddle_occurred_at     timestamptz;

-- Unique constraints enable idempotent upserts.
-- PostgreSQL NULLs are never equal, so multiple NULL rows are safe.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_paddle_subscription_id_unique'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_paddle_subscription_id_unique
      unique (paddle_subscription_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_paddle_transaction_id_unique'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_paddle_transaction_id_unique
      unique (paddle_transaction_id);
  end if;
end; $$;

comment on column public.subscriptions.paddle_subscription_id is
  'Paddle subscription ID (sub_*). NULL for one-time founder transactions.';
comment on column public.subscriptions.paddle_transaction_id is
  'Paddle transaction ID (txn_*). NULL for recurring subscriptions.';
comment on column public.subscriptions.paddle_customer_id is
  'Paddle customer ID (ctm_*). Stored for portal/support lookups.';
comment on column public.subscriptions.paddle_management_url is
  'Paddle update-payment-method URL (signed, temporary). Best-effort only — '
  'expires within hours; refreshed opportunistically on each subscription webhook. '
  'Do not treat as durable; always prefer a fresh URL from the Paddle API for '
  'production billing UI.';
comment on column public.subscriptions.paddle_occurred_at is
  'Timestamp of the last Paddle event applied to this row. Used to reject stale out-of-order webhooks.';
