ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_ls_order_id_unique UNIQUE (ls_order_id);
