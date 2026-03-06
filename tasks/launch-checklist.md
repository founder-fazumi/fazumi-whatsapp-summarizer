# Fazumi MVP Launch Checklist

## Pre-Launch Tests (Must Pass)

### 1. Webhook Verification
- [x] Local webhook replay: `order_created_founder`
- [x] Local webhook replay: `subscription_payment_success`
- [x] Database updated correctly (subscriptions table)
- [x] Database updated correctly (profiles.plan)
- [x] Webhook signature verification works

### 2. Payment Flow Test
- [ ] Checkout button redirects to Lemon Squeezy
- [ ] Test payment completes successfully
- [ ] Webhook fires automatically
- [ ] User plan updates in database
- [x] Billing page shows correct plan

### 3. Core Flow Test
- [ ] Signup with Google works
- [x] Signup with email works
- [x] Paste -> Summarize -> Save works
- [x] History page shows summaries
- [x] Delete summary works
- [x] Usage limits enforced (3/day trial)

### 4. Security Test
- [x] RLS prevents user A from seeing user B's data
- [x] No raw chat text in database
- [x] Webhook signature required
- [x] Auth middleware protects `/dashboard`

### 5. Production Health Check
- [ ] GET `/api/health` returns all true
- [ ] Sentry receives test error
- [ ] Supabase connection works
- [ ] OpenAI connection works

## Test Results

### Test Date: 2026-03-02
### Tester: Codex
### Environment: Local (plus limited production DNS probe)

| Test | Status | Notes |
|------|--------|-------|
| Webhook replay | Pass | Founder and monthly replays passed against an isolated local dev server with temporary Lemon env overrides; DB rows and structured logs verified. |
| Payment flow | Fail | Live Lemon Squeezy checkout was not exercised end-to-end; only billing state after webhook replay was verified. |
| Core flow | Fail | Email signup, summarize/save, history, delete, limits, and 375px mobile flow passed; Google OAuth is disabled locally. |
| Security | Pass | RLS isolation, invalid webhook signature, no raw chat text schema, and `/dashboard` auth redirect verified. |
| Health check | Fail | Local `/api/health` passes; production `https://fazumi.app/api/health` could not be resolved from this environment. |

## Webhook Test Results

### Founder Plan Replay
- Status: Pass
- Timestamp: 2026-03-02T07:55:13Z
- Notes: Replayed successfully against an isolated local server on port `3001` with temporary `NEXT_PUBLIC_LS_FOUNDER_VARIANT` and `LEMONSQUEEZY_WEBHOOK_SECRET` env overrides. `free@fazumi.test` was upgraded to `founder`, `subscriptions.plan_type = founder`, and logs contained `webhook.start`, `webhook.parsed`, `webhook.success`.

### Monthly Plan Replay
- Status: Pass
- Timestamp: 2026-03-02T07:56:11Z
- Notes: Replayed successfully against the isolated local server on port `3001`. `paid@fazumi.test` moved from `free` back to `monthly`, `subscriptions.status = active`, `current_period_end = 2026-04-01T00:00:00+00:00`, and logs contained `webhook.start`, `webhook.parsed`, `webhook.success`.

## RLS Verification

### Tables with RLS enabled
- [x] summaries
- [x] profiles
- [x] subscriptions
- [x] usage_daily

### User isolation test
- Status: Pass

### Notes
- Verified migration coverage with `alter table ... enable row level security` present for all four tables.
- Runtime isolation probe: `free@fazumi.test` saw `0` rows for `paid@fazumi.test` summaries, while `paid` saw `1` owned row.

## Production Deployment

- Deployment Status: Failed
- Deployment URL: https://fazumi.app
- Health Check: Fail
- Sentry Test: Fail

### Environment Variables
- [ ] Supabase configured
- [ ] OpenAI configured
- [ ] Lemon Squeezy configured
- [ ] Sentry configured

### Notes
- `fazumi.app` did not resolve from this environment (`No such host is known`), so production health and Sentry were not verified.
- No commit or push was attempted because the worktree contains unrelated modified and untracked files outside this launch-prep slice.

## Blockers

- Google OAuth is not enabled in the local Supabase project. The login page returned: `Google sign-in is not enabled in Supabase for this project.`
- Live Lemon Squeezy checkout was not tested end-to-end; only webhook replay and billing state were verified locally.
- Production `fazumi.app` was not reachable from this environment, so production health and Sentry checks remain unverified.
- The repository has unrelated modified and untracked files, so a safe `git commit` / `git push origin main` was not performed from this session.

## Launch Approval

- [ ] All critical tests passed
- [ ] No P0 blockers
- [ ] Production health check passed
- [ ] Payment flow verified

**Approved for launch:** Not approved  
**Date:** 2026-03-02  
**Time:** 08:05 UTC

## MVP Readiness Score

- Total Tests: 25
- Passed: 15
- Failed: 10
- Readiness: 60%
- Decision: FIX FIRST

## Sign-Off

- [ ] All tests passed
- [ ] No critical blockers
- [ ] Ready for production launch

**Approved by:** Pending  
**Date:** 2026-03-02
