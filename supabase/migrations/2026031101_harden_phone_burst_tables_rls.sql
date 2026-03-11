-- Legacy WA-bot coordination tables stay in `public` for compatibility with the
-- existing helper functions, but they should never be queried directly by client roles.

ALTER TABLE IF EXISTS public.worker_phone_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worker_phone_locks_no_access" ON public.worker_phone_locks;
CREATE POLICY "worker_phone_locks_no_access" ON public.worker_phone_locks
  FOR ALL USING (false);

ALTER TABLE IF EXISTS public.phone_bursts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "phone_bursts_no_access" ON public.phone_bursts;
CREATE POLICY "phone_bursts_no_access" ON public.phone_bursts
  FOR ALL USING (false);
