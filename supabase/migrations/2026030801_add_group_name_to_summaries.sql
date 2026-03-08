ALTER TABLE public.summaries
  ADD COLUMN IF NOT EXISTS group_name text;
