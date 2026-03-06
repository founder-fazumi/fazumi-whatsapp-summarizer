import { AdminShell } from "@/components/admin/AdminShell";
import { AdminInboxContent } from "@/components/admin/AdminInboxContent";
import { requireAdminPageSession } from "@/lib/admin/auth";
import { getAdminInboxData } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  await requireAdminPageSession("/admin_dashboard/inbox");
  const data = await getAdminInboxData();

  return (
    <AdminShell>
      <AdminInboxContent initialData={data} />
    </AdminShell>
  );
}
