import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function BillingPage() {
  return (
    <DashboardShell>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <CreditCard className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <CardTitle>Billing</CardTitle>
                <CardDescription>Manage your subscription and invoices</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Current plan</p>
              <p className="mt-1 text-2xl font-bold text-[var(--primary)]">Free Trial</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Upgrade to continue after your trial ends.
              </p>
            </div>

            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary-hover)] transition-colors"
            >
              View plans
              <ExternalLink className="h-4 w-4" />
            </Link>

            <p className="text-xs text-[var(--muted-foreground)]">
              Billing portal and invoice history coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
