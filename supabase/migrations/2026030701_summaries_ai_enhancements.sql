-- Adds new AI output columns to the summaries table.
-- All columns have safe defaults for backward compatibility with existing rows.
-- important_dates is already jsonb and can now store ImportantDate objects
-- instead of plain strings (both formats are handled by the app layer).

ALTER TABLE public.summaries
  ADD COLUMN IF NOT EXISTS urgent_action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contacts            jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS chat_type           text  NOT NULL DEFAULT 'routine_update',
  ADD COLUMN IF NOT EXISTS chat_context        jsonb     NULL;
