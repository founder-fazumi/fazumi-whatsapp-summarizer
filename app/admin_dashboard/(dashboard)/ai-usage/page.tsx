import { AdminShell } from "@/components/admin/AdminShell";
import { AiUsageContent } from "@/components/admin/AiUsageContent";
import { requireAdminPageSession } from "@/lib/admin/auth";
import { getAdminAiUsageData } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminAiUsagePage() {
  await requireAdminPageSession("/admin_dashboard/ai-usage");
  const data = await getAdminAiUsageData();

  return (
    <AdminShell>
      <AiUsageContent initialData={data} />
    </AdminShell>
  );
}
