import { AdminLoginScreen } from "@/components/admin/AdminLoginScreen";
import { redirectAuthenticatedAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await redirectAuthenticatedAdmin();

  const { next } = await searchParams;

  return <AdminLoginScreen next={next} />;
}
