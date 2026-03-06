import { AdminShell } from "@/components/admin/AdminShell";
import { AdminIncomeContent } from "@/components/admin/AdminIncomeContent";
import { getAdminIncomeData } from "@/lib/admin/queries";
import { requireAdminPageSession } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardIncomePage() {
  await requireAdminPageSession("/admin_dashboard/income");

  const data = await getAdminIncomeData();

  return (
    <AdminShell>
      <AdminIncomeContent initialData={data} />
    </AdminShell>
  );
}
