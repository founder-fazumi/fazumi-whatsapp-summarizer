import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sanitizeAdminNextPath } from "@/lib/admin/auth";

interface AdminLoginScreenProps {
  next?: string;
}

export function AdminLoginScreen({ next }: AdminLoginScreenProps) {
  return (
    <>
      <main
        data-admin-login="true"
        className="flex min-h-screen items-center justify-center px-4 py-12"
      >
        <Card className="w-full max-w-sm bg-[var(--surface-elevated)]">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-3xl font-semibold text-[var(--text-strong)]">
              Welcome Back, Sir.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdminLoginForm nextPath={sanitizeAdminNextPath(next)} />
          </CardContent>
        </Card>
      </main>
      <style>{`
        main[data-admin-login="true"] ~ footer {
          display: none;
        }
      `}</style>
    </>
  );
}
