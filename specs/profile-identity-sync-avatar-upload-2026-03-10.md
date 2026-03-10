# Profile Identity Sync + Click-to-Upload Avatar (2026-03-10)

## Context
- `/settings` currently saves `full_name`, but `/dashboard` still derives its greeting from auth metadata, which can lag behind the saved profile row.
- `/settings` currently asks for a public avatar URL instead of letting the user click the current avatar and upload a photo from their device.
- The fix must stay inside the current stack: Next.js + Supabase Auth/DB/Storage. No raw chat storage rules are affected.

## Decision
- Treat the saved profile row as the authoritative server-side source for dashboard identity fields like `full_name`.
- Keep mirroring `full_name` and `avatar_url` into Supabase Auth `user_metadata` so shell surfaces that depend on the auth user stay aligned.
- Replace the manual avatar-URL input in `/settings` with a clickable avatar button that uploads an image file through an authenticated API route backed by Supabase Storage.

## Scope
- `/settings`: clickable current avatar opens file picker, uploads supported image formats, and updates the visible avatar immediately.
- `/dashboard`: greeting uses the saved profile name and updates after a profile-save event.
- Shared shell: top bar avatar/name react immediately after profile updates.

## Non-goals
- No account deletion changes.
- No raw chat upload/storage changes.
- No new third-party image service or image-editor flow.

## Acceptance Criteria
1. Saving a new display name in `/settings` updates the dashboard greeting in both English and Arabic.
2. Clicking the current avatar in `/settings` opens the device file picker and uploads a supported image.
3. Successful avatar upload updates the visible avatar in settings and the shared top bar without requiring logout/login.
4. Invalid avatar uploads fail with a safe user-facing error and do not change the saved profile.
5. `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
