import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { BrandLogo } from "@/components/shared/BrandLogo";
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
    <div className="mx-auto flex w-full max-w-sm flex-col items-center">
      <BrandLogo size="md" className="mb-4" />
      <Card className="mx-auto w-full max-w-sm bg-[var(--surface-elevated)]">
        <CardHeader className="pb-4 text-center">
          <CardTitle className="whitespace-nowrap text-3xl font-semibold text-[var(--text-strong)]" dir="ltr">
            Welcome Back, Sir.
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminLoginForm nextPath={sanitizeAdminNextPath(next)} />
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
        Admin access · dev-only
      </p>
    </div>
  );
}
