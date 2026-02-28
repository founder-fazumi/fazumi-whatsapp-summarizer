import { DashboardShell } from "@/components/layout/DashboardShell";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <DashboardShell>
      <Card>
        <CardHeader>
          <CardTitle>
            <LocalizedText en="Privacy Policy" ar="سياسة الخصوصية" />
          </CardTitle>
          <p className="text-xs text-[var(--muted-foreground)]">
            <LocalizedText en="Last updated: March 2026" ar="آخر تحديث: مارس 2026" />
          </p>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-[var(--foreground)]">
          <section>
            <h2 className="text-base font-semibold mb-2">1. What we collect</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              We collect your email address, name, and OAuth profile picture when you sign up.
              We store the structured summaries your account generates (dates, tasks, links, questions).
              We collect basic usage data (number of summaries, plan tier) to enforce plan limits and improve the product.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">2. What we do NOT store</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              We never store, log, or retain the raw chat text you paste or upload.
              Your WhatsApp messages are processed in memory and immediately discarded after the summary is generated.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">3. How we use your data</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Your data is used to deliver the service (generating and displaying summaries),
              enforce your plan limits, and send transactional emails (e.g. trial expiry reminders).
              We do not sell your data to third parties. We do not use your data for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">4. Data retention</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Summaries are retained until you delete them or close your account.
              On account deletion, all summaries and profile data are permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">5. Security</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Data is stored in Supabase (hosted on AWS). Connections are encrypted via TLS.
              Row-level security policies ensure users can only access their own data.
              We do not have access to your OAuth passwords.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">6. Children</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Fazumi is not directed at children under 13. If you believe a child under 13
              has created an account, contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">7. Contact</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              For privacy questions or data deletion requests:{" "}
              <a href="mailto:privacy@fazumi.app" className="text-[var(--primary)] hover:underline">
                privacy@fazumi.app
              </a>
            </p>
          </section>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
