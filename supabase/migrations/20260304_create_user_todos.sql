-- user_todos: manually-managed action items per user
CREATE TABLE IF NOT EXISTS public.user_todos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       text NOT NULL CHECK (char_length(trim(label)) > 0),
  done        boolean NOT NULL DEFAULT false,
  due_date    date,
  sort_order  integer NOT NULL DEFAULT 0,
  note        text,
  source      text NOT NULL DEFAULT 'manual',   -- 'manual' | 'summary'
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_todos_user_id_idx ON public.user_todos(user_id);
CREATE INDEX IF NOT EXISTS user_todos_due_date_idx ON public.user_todos(user_id, due_date);

ALTER TABLE public.user_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_todos_select_own" ON public.user_todos;
CREATE POLICY "user_todos_select_own" ON public.user_todos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_todos_insert_own" ON public.user_todos;
CREATE POLICY "user_todos_insert_own" ON public.user_todos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_todos_update_own" ON public.user_todos;
CREATE POLICY "user_todos_update_own" ON public.user_todos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_todos_delete_own" ON public.user_todos;
CREATE POLICY "user_todos_delete_own" ON public.user_todos
  FOR DELETE USING (auth.uid() = user_id);
