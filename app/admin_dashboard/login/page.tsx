import { redirect } from "next/navigation";

/**
 * Legacy login path — redirects to the canonical admin login route.
 * The canonical path is /admin-dashboard/login (see lib/admin/auth.ts ADMIN_LOGIN_PATH).
 * Note: next.config.ts also adds a permanent redirect from /admin_dashboard/login.
 */
export default async function LegacyAdminLoginRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = next
    ? `/admin-dashboard/login?next=${encodeURIComponent(next)}`
    : "/admin-dashboard/login";
  redirect(destination);
}
