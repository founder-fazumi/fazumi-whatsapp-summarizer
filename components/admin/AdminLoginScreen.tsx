import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Card, CardContent } from "@/components/ui/card";
import { sanitizeAdminNextPath } from "@/lib/admin/auth";

interface AdminLoginScreenProps {
  next?: string;
}

export function AdminLoginScreen({ next }: AdminLoginScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center">
      <BrandLogo size="md" className="mb-3" />
      <p className="mb-5 text-center text-sm text-[var(--muted-foreground)]" dir="ltr">
        Welcome back, Sir. Please sign in.
      </p>
      <Card className="mx-auto w-full max-w-sm bg-[var(--surface-elevated)]">
        <CardContent className="pt-6">
          <AdminLoginForm nextPath={sanitizeAdminNextPath(next)} />
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
        Admin access only
      </p>
    </div>
  );
}
