# Forgot Password Flow (2026-03-10)

## Goal
Add a safe forgot-password flow that starts on `/login`, emails a recovery link, and lets the user set a new password after returning through the existing Supabase auth callback flow.

## Why
- Email/password login already exists, but there is no recovery path when a user forgets their password.
- The flow must match basic recovery hardening: do not reveal whether an email exists, do not leave reset tokens on a rendered page, and force a fresh login after the password changes.

## Research constraints
- OWASP Forgot Password Cheat Sheet: use consistent responses, avoid account enumeration, use a single-use time-limited email link, and do not change the account until the user presents the valid token.
- Supabase Auth: use `auth.resetPasswordForEmail()` with `redirectTo`, land the user back in the app, then call `auth.updateUser({ password })` from the recovery session.
- Community guidance from the referenced Reddit thread aligns with the same principles: generic success messaging, no user enumeration, and a dedicated reset screen instead of resetting inline from the request form.

## Scope
### In
- Add a “Forgot password?” path inside `/login`
- Send the reset request through Supabase browser auth
- Add `/reset-password` with new-password + confirm-password fields
- Handle Supabase recovery redirects on that browser route and clear the hash after the session is established
- After successful reset, sign the user out globally and return them to `/login` with a success message
- Add Playwright coverage for the request UI and reset completion flow

### Out
- No schema changes
- No new services
- No custom email delivery system
- No profile/settings password-change feature beyond the recovery route

## UX requirements
1. `/login` shows a clear “Forgot password?” action in the email/password tab.
2. Submitting the request always shows the same success copy when Supabase accepts the request, regardless of whether the email belongs to an account.
3. The request form keeps EN/AR copy and RTL behavior aligned with the current auth page.
4. The reset page requires:
   - new password
   - confirm password
   - minimum length 8
   - inline mismatch validation
5. A user who opens `/reset-password` without a valid recovery session sees a calm fallback state that sends them back to `/login`.

## Security requirements
1. Do not reveal whether an email exists.
2. Do not persist reset tokens or raw email-reset payloads in the app database.
3. Accept the recovery redirect on a dedicated browser-only route and clear the URL hash immediately after establishing the recovery session.
4. After password change, revoke browser session state with a global sign-out and require a fresh login.

## Acceptance criteria
- `/login` can request a password reset email for the typed email address.
- Recovery links land on `/reset-password`, establish a recovery session, and clear the hash before the user submits a new password.
- `/reset-password` updates the password only when the user has a valid recovery session.
- On success, the user lands on `/login?reset=success` and can sign in with the new password.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
