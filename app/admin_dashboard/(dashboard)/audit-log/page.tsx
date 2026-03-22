import { requireAdminPageSession } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AdminAuditLogContent } from "@/components/admin/AdminAuditLogContent";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogPage() {
  await requireAdminPageSession("/admin-dashboard/audit-log");

  return (
    <AdminShell
      breadcrumb={
        <AdminBreadcrumb
          items={[
            { label: "Admin", href: "/admin-dashboard" },
            { label: "Audit Log" },
          ]}
        />
      }
    >
      <AdminAuditLogContent />
    </AdminShell>
  );
}
