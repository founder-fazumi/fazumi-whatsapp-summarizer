# Admin Dashboard

## Overview KPIs

- `New users`: New `profiles` rows created in the selected window.
- `Active users`: Unique users who generated at least one summary in the selected window.
- `Summaries`: Total summary records created in the selected window.
- `OpenAI spend`: Estimated OpenAI cost from `ai_request_logs` in the selected window.
- `Revenue MTD`: Estimated month-to-date revenue from paid `subscriptions` created this month.
- `Failed webhooks`: Failed or rejected Lemon Squeezy deliveries from `webhook_delivery_log` over the last 7 days.
- `Support new`: Support requests in `support_requests` with status `new`.
- `Feedback new`: Feedback records in `user_feedback` with status `new`.

## Triage Workflow

- Open `Admin inbox` and choose `Feedback` or `Support`.
- Use search plus status, priority, language, date, and tag filters to narrow the queue.
- Open any item to review the full message and metadata.
- Set `status` to `in_progress` while working, `resolved` when done, or `closed` when no further action is needed.
- Raise `priority` to `high` or `critical` for urgent billing, access, reliability, or user-impacting issues.
- Add comma-separated `tags` for patterns such as `billing`, `mobile`, `rtl`, or `bug`.
- Store internal follow-up context in `admin notes`. These notes are not exposed publicly.

## Security Model

- Admin route access requires a valid Supabase session and `profiles.role = 'admin'`.
- Admin pages and admin API routes are blocked for non-admin users in middleware and rechecked server-side.
- Admin reads and writes use `SUPABASE_SERVICE_ROLE_KEY` on the server only.
- `support_requests` is never client-readable. It is written through `/api/contact` and read only by server-side admin flows.
- `user_feedback` is no longer publicly readable. Admin access uses server-side service-role queries.
- `profiles` no longer exposes a blanket client update path. Preference updates now go through `/api/profile`, which validates the authenticated user and performs a server-side write.
- Lemon Squeezy webhook results are logged to `webhook_delivery_log` as best-effort observability data without blocking billing flows if logging fails.
