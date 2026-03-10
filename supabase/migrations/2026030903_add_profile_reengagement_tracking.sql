ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_reengagement_sent_at timestamptz;
