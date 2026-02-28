import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RefundsPage() {
  return (
    <DashboardShell>
      <Card>
        <CardHeader>
          <CardTitle>Refund Policy</CardTitle>
          <p className="text-xs text-[var(--muted-foreground)]">Last updated: March 2026</p>
        </CardHeader>
        <CardContent className="space-y-6 text-[var(--foreground)]">
          <section>
            <h2 className="text-base font-semibold mb-2">1. Monthly & Annual subscriptions</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              We offer a 14-day money-back guarantee on your first payment for monthly and annual plans.
              If you are not satisfied, contact us within 14 days of your first charge and we will
              issue a full refund — no questions asked.
              Subsequent renewals are not eligible for refunds.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">2. Founder LTD</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              The Founder Lifetime Deal is a one-time purchase and is final sale.
              No refunds are offered for Founder LTD purchases.
              By completing the purchase you acknowledge and agree to this policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">3. How to request a refund</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Email{" "}
              <a href="mailto:billing@fazumi.app" className="text-[var(--primary)] hover:underline">
                billing@fazumi.app
              </a>{" "}
              with the subject line &quot;Refund request&quot; and include your registered email address.
              Refunds are processed within 5–10 business days to your original payment method.
            </p>
          </section>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
