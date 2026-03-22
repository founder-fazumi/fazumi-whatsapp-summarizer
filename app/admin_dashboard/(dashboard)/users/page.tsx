import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { getAdminUsersData } from "@/lib/admin/queries";
import { requireAdminPageSession } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardUsersPage() {
  await requireAdminPageSession("/admin-dashboard/users");

  const data = await getAdminUsersData();

  return (
    <AdminShell
      breadcrumb={
        <AdminBreadcrumb
          items={[{ label: "Admin", href: "/admin-dashboard" }, { label: "Users" }]}
          dir="ltr"
        />
      }
    >
      <AdminUsersTable initialData={data} />
    </AdminShell>
  );
}
