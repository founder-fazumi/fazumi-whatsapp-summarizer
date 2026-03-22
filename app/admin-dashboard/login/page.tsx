import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminLoginScreen } from "@/components/admin/AdminLoginScreen";
import { AdminThemeSwitcher } from "@/components/admin/AdminThemeSwitcher";
import {
  ADMIN_HOME_PATH,
  hasAdminSession,
  isAdminDashboardEnabled,
} from "@/lib/admin/auth";

// Real route file — canonical admin login page.
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

export default async function AdminDashboardLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!isAdminDashboardEnabled()) {
    return <AdminNotConfigured />;
  }

  const cookieStore = await cookies();

  if (await hasAdminSession(cookieStore)) {
    redirect(ADMIN_HOME_PATH);
  }

  const { next } = await searchParams;

  return (
    <>
      <div
        data-admin-login="true"
        className="relative min-h-screen flex flex-col items-center justify-center bg-[var(--background)] p-4"
      >
        <div className="absolute top-4 end-4">
          <AdminThemeSwitcher />
        </div>
        <AdminLoginScreen next={next} />
      </div>
      <style>{`
        div[data-admin-login="true"] ~ footer { display: none; }
        header:has(+ div[data-admin-login="true"]) { display: none; }
      `}</style>
    </>
  );
}
