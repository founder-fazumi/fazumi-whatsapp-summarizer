import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AdminOverviewContent } from "@/components/admin/AdminOverviewContent";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  ADMIN_LOGIN_PATH,
  hasAdminSession,
  isAdminDashboardEnabled,
  sanitizeAdminNextPath,
} from "@/lib/admin/auth";
import { getAdminOverviewMetrics } from "@/lib/admin/queries";

// Real route file — canonical admin dashboard home.
// This file takes precedence over any rewrite in next.config.ts.
// Never calls notFound(): if admin is not configured, a clear message is shown instead.
export const dynamic = "force-dynamic";

function AdminNotConfigured() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-8">
      <div className="text-center max-w-sm">
        <p className="text-base font-semibold text-[var(--foreground)]">
          Admin Unavailable
        </p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          The admin dashboard is not configured in this environment.
        </p>
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  if (!isAdminDashboardEnabled()) {
    return <AdminNotConfigured />;
  }

  // Middleware already redirects unauthenticated requests to login —
  // this is a belt-and-suspenders check in case middleware is bypassed.
  const cookieStore = await cookies();

  if (!(await hasAdminSession(cookieStore))) {
    redirect(
      `${ADMIN_LOGIN_PATH}?next=${encodeURIComponent(sanitizeAdminNextPath("/admin-dashboard"))}`
    );
  }

  const metrics = await getAdminOverviewMetrics();

  return (
    <AdminShell
      breadcrumb={
        <AdminBreadcrumb
          items={[{ label: "Admin", href: "/admin-dashboard" }, { label: "Overview" }]}
          dir="ltr"
        />
      }
    >
      <AdminOverviewContent initialMetrics={metrics} />
    </AdminShell>
  );
}
