import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AdminShell } from "@/components/admin/AdminShell";
import { AiUsageContent } from "@/components/admin/AiUsageContent";
import { requireAdminPageSession } from "@/lib/admin/auth";
import { getAdminAiUsageData } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminAiUsagePage() {
  await requireAdminPageSession("/admin_dashboard/ai-usage");
  const data = await getAdminAiUsageData();

  return (
    <AdminShell
      breadcrumb={
        <AdminBreadcrumb
          items={[{ label: "Admin", href: "/admin_dashboard" }, { label: "AI Usage" }]}
          dir="ltr"
        />
      }
    >
      <AiUsageContent initialData={data} />
    </AdminShell>
  );
}
