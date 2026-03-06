-- Admin audit log: tracks every state-changing admin action
-- Only service role can write; no authenticated user can read this table.
-- admin_username is the ADMIN_USERNAME env value (cookie-based auth, not Supabase UUID).
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_username text NOT NULL,            -- ADMIN_USERNAME env value of the admin who acted
  action         text NOT NULL,            -- e.g. "ban_users", "reset_ban", "update_inbox"
  target_type text NOT NULL,               -- "user" | "feedback" | "support" | "subscription"
  target_ids  text[] NOT NULL DEFAULT '{}', -- IDs affected by the action
  details     jsonb NOT NULL DEFAULT '{}', -- e.g. { "status": "resolved", "bannedUntil": "..." }
  ip          text,                        -- x-forwarded-for from the request
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- No authenticated user (including admins) can read or write via client SDK.
-- All writes happen through the service-role key on the server only.
CREATE POLICY "admin_audit_log_no_access" ON public.admin_audit_log
  FOR ALL USING (false);
