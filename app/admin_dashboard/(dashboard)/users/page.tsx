import { AdminShell } from "@/components/admin/AdminShell";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { getAdminUsersData } from "@/lib/admin/queries";
import { requireAdminPageSession } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardUsersPage() {
  await requireAdminPageSession("/admin_dashboard/users");

  const data = await getAdminUsersData();

  return (
    <AdminShell>
      <AdminUsersTable initialData={data} />
    </AdminShell>
  );
}
