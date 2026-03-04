import { Shield } from "lucide-react";
import { redirectAuthenticatedAdmin } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { BrandLogo } from "@/components/shared/BrandLogo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await redirectAuthenticatedAdmin();

  const { next } = await searchParams;
  const nextPath =
    typeof next === "string" && next.startsWith("/admin_dashboard")
      ? next
      : "/admin_dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLogo size="lg" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
              Fazumi Admin
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Development-only access for the local admin dashboard.
            </p>
          </div>
        </div>

        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Sign in</CardTitle>
                <CardDescription>
                  Uses `ADMIN_USER` and `ADMIN_PASS` when set, otherwise `admin / admin`.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminLoginForm nextPath={nextPath} />
            <p className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
              This gate is only available when `NODE_ENV` is `development`. The admin route is blocked in production.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
