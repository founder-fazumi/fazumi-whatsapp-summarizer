-- Fix P0: user_feedback table is publicly readable
-- Remove the overly permissive "using (true)" policy
-- Only allow users to read their own feedback, admins read via service role

drop policy if exists "user_feedback: admin select" on public.user_feedback;
drop policy if exists "user_feedback: own select" on public.user_feedback;
drop policy if exists "user_feedback: own insert" on public.user_feedback;

-- Users can only see their own feedback
create policy "user_feedback: own select"
  on public.user_feedback for select
  using (auth.uid() = user_id);

-- Users can insert their own feedback
create policy "user_feedback: own insert"
  on public.user_feedback for insert
  with check (auth.uid() = user_id or user_id is null);

-- No update/delete for users (admin-only via service role)
