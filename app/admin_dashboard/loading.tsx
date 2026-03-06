import { AdminLoadingSkeleton } from "@/components/admin/AdminLoadingSkeleton";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminDashboardLoading() {
  return (
    <AdminShell>
      <AdminLoadingSkeleton />
    </AdminShell>
  );
}
