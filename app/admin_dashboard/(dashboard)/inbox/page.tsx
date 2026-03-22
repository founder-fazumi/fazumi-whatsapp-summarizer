import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminInboxContent } from "@/components/admin/AdminInboxContent";
import { requireAdminPageSession } from "@/lib/admin/auth";
import { getAdminInboxData } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  await requireAdminPageSession("/admin-dashboard/inbox");
  const data = await getAdminInboxData();

  return (
    <AdminShell
      breadcrumb={
        <AdminBreadcrumb
          items={[{ label: "Admin", href: "/admin-dashboard" }, { label: "Inbox" }]}
          dir="ltr"
        />
      }
    >
      <AdminInboxContent initialData={data} />
    </AdminShell>
  );
}
