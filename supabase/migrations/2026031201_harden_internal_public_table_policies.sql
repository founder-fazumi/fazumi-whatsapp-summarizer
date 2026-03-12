-- Internal/admin tables that stay in the exposed `public` schema must fail
-- closed for client roles. Supported access remains service-role server code
-- and existing SECURITY DEFINER / RPC helper flows.

ALTER TABLE IF EXISTS public.worker_phone_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worker_phone_locks_no_access" ON public.worker_phone_locks;
CREATE POLICY "worker_phone_locks_no_access" ON public.worker_phone_locks
  FOR ALL
  USING (false)
  WITH CHECK (false);

ALTER TABLE IF EXISTS public.phone_bursts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "phone_bursts_no_access" ON public.phone_bursts;
CREATE POLICY "phone_bursts_no_access" ON public.phone_bursts
  FOR ALL
  USING (false)
  WITH CHECK (false);

ALTER TABLE IF EXISTS public.ai_request_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_request_logs_no_access" ON public.ai_request_logs;
CREATE POLICY "ai_request_logs_no_access" ON public.ai_request_logs
  FOR ALL
  USING (false)
  WITH CHECK (false);

ALTER TABLE IF EXISTS public.marketing_spend ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_spend_no_access" ON public.marketing_spend;
CREATE POLICY "marketing_spend_no_access" ON public.marketing_spend
  FOR ALL
  USING (false)
  WITH CHECK (false);
