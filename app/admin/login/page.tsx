import { AdminThemeSwitcher } from "@/components/admin/AdminThemeSwitcher";
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

  return (
    <>
      <div
        data-admin-login="true"
        className="relative min-h-screen flex flex-col items-center justify-center bg-[var(--background)] p-4"
      >
        <div className="absolute top-4 end-4">
          <AdminThemeSwitcher />
        </div>
        <AdminLoginScreen next={next} />
      </div>
      <style>{`
        div[data-admin-login="true"] ~ footer { display: none; }
        header:has(+ div[data-admin-login="true"]) { display: none; }
      `}</style>
    </>
  );
}
