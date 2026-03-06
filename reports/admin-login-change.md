# Admin Login Change

## Routes Added / Changed

- Added `/admin/login` as the dedicated admin login entry.
- Updated `/admin_dashboard/login` to use the same simplified admin-only login form for compatibility.
- Added `POST /api/admin/login` for server-side admin credential verification and cookie issuance.
- Added `POST /api/admin/logout` to clear the admin session cookie without affecting regular user auth.
- Updated admin route guards so `/admin/*`, `/admin_dashboard/*`, and `/api/admin/*` require the admin cookie, while unauthenticated admin page requests redirect to `/admin/login?next=...`.

## Environment Variables

- `ADMIN_USERNAME`
  Default: `admin`
- `ADMIN_PASSWORD`
  Default: `admin`

## Local Testing

1. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env.local` if you want values other than the defaults.
2. Run `pnpm dev`.
3. Open `/admin_dashboard` while logged out and confirm it redirects to `/admin/login`.
4. Confirm `/admin/login` shows only the `Username`, `Password`, and `Log in` controls, with the heading `Welcome Back, Sir.`.
5. Sign in with `admin` / `admin` and confirm the app redirects to `/admin_dashboard`.
6. Try an incorrect password and confirm the login stays on `/admin/login` and does not set access.
7. Confirm the normal `/login` page still behaves like the user auth flow and still shows OAuth if configured.
