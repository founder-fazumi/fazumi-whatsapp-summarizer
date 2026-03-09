ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_ls_order_id_unique;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_ls_order_id_unique UNIQUE (ls_order_id);
