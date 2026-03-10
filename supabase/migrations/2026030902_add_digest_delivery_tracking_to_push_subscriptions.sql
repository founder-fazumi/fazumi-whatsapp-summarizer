ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS last_morning_digest_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_weekly_digest_at timestamptz;

UPDATE public.push_subscriptions
SET last_morning_digest_at = COALESCE(last_morning_digest_at, last_notified_at)
WHERE last_morning_digest_at IS NULL
  AND last_notified_at IS NOT NULL;
