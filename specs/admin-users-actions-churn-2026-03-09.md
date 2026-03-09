# Admin Users Actions + Churn Status (2026-03-09)

## Scope
- Add a recent-user avatar stack to the admin users table header.
- Replace the plain activity status cell with a churn-risk badge.
- Add per-user actions for plan changes, trial extension, ban, and reset ban.
- Add two guarded admin POST routes for plan changes and trial extension.

## Live workspace drift
- `components/admin/AdminUsersTable.tsx` currently has bulk ban/reset controls but no row-level actions column.
- The file uses inline success/error banners, not a toast helper, so this slice should keep that notification pattern.
- `components/ui/dropdown-menu.tsx` currently exposes a legacy helper API, not the shadcn-style primitive exports this slice needs.
- The users payload does not expose `trial_expires_at` to the client table, so trial extension feedback can only be banner-based unless the table is refreshed later.

## Non-goals
- Do not change `lib/admin/auth.ts`, `lib/admin/queries.ts`, `lib/admin/types.ts`, or `lib/admin/audit.ts`.
- Do not add new dependencies.
- Do not change admin data-fetching shapes beyond local optimistic UI updates in the table.

## Acceptance criteria
- `components/admin/AdminAvatarStack.tsx` exists and renders up to five overlapping initials avatars plus a muted overflow pill.
- `components/admin/ChurnRiskBadge.tsx` exists and renders bilingual Active / At Risk / Inactive / Never badges from `lastActiveAt`.
- `components/admin/AdminUsersTable.tsx` shows the localized users header, recent-user avatar stack, churn badges, and an actions dropdown that preserves ban/reset behavior while adding plan-change and trial-extend actions.
- `app/api/admin/users/plan-change/route.ts` and `app/api/admin/users/trial-extend/route.ts` exist, use the existing admin guard/audit/service-role helpers, and compile.
- `pnpm lint` and `pnpm typecheck` pass. `pnpm test` is attempted and recorded.
