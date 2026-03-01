alter table public.subscriptions
  add column if not exists ls_customer_portal_url text;

alter table public.subscriptions
  add column if not exists ls_update_payment_method_url text;

comment on column public.subscriptions.ls_customer_portal_url is
  'Latest signed Lemon Squeezy customer portal URL from webhook/API payloads; may expire after about 24 hours.';

comment on column public.subscriptions.ls_update_payment_method_url is
  'Latest signed Lemon Squeezy update payment method URL from webhook/API payloads; may expire after about 24 hours.';
