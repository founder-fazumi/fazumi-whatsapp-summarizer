import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminOverviewContent } from "@/components/admin/AdminOverviewContent";
import { getAdminOverviewMetrics } from "@/lib/admin/queries";
import { requireAdminPageSession } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardOverviewPage() {
  await requireAdminPageSession("/admin-dashboard");

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
