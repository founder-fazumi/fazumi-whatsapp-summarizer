import { redirect } from "next/navigation";

/**
 * Legacy login path — redirects to the canonical admin login route.
 * The canonical path is /admin/login (see lib/admin/auth.ts ADMIN_LOGIN_PATH).
 */
export default async function LegacyAdminLoginRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = next
    ? `/admin/login?next=${encodeURIComponent(next)}`
    : "/admin/login";
  redirect(destination);
}
