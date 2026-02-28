import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, ExternalLink, Check } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCustomerPortalUrl } from "@/lib/lemonsqueezy";
import type { Profile } from "@/lib/supabase/types";

const PLAN_LABELS: Record<string, { name: string; price: string; color: string }> = {
  free:    { name: "Free",          price: "$0",       color: "text-[var(--muted-foreground)]" },
  monthly: { name: "Pro Monthly",   price: "$9.99/mo", color: "text-[var(--primary)]" },
  annual:  { name: "Pro Annual",    price: "$99.99/yr",color: "text-[var(--primary)]" },
  founder: { name: "Founder LTD",   price: "$149",     color: "text-emerald-600" },
};

const PLAN_FEATURES: Record<string, string[]> = {
  free:    ["3 lifetime summaries", "Summary history", "EN + AR support"],
  monthly: ["50 summaries / day", "200 / month", "Priority support", "Full history"],
  annual:  ["50 summaries / day", "200 / month", "Priority support", "Full history", "2 months free"],
  founder: ["50 summaries / day", "200 / month", "Lifetime access", "All future features"],
};

export default async function BillingPage() {
  let plan = "free";
  let trialExpiresAt: string | null = null;
  let portalUrl: string | null = null;
  let periodEnd: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const [{ data: profile }, { data: sub }] = await Promise.all([
        supabase
          .from("profiles")
          .select("plan, trial_expires_at")
          .eq("id", user.id)
          .single<Pick<Profile, "plan" | "trial_expires_at">>(),
        supabase
          .from("subscriptions")
          .select("ls_subscription_id, status, current_period_end")
          .eq("user_id", user.id)
          .in("status", ["active", "cancelled"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<{
            ls_subscription_id: string | null;
            status: string;
            current_period_end: string | null;
          }>(),
      ]);

      plan = profile?.plan ?? "free";
      trialExpiresAt = profile?.trial_expires_at ?? null;
      periodEnd = sub?.current_period_end ?? null;

      if (sub?.ls_subscription_id) {
        portalUrl = await getCustomerPortalUrl(sub.ls_subscription_id);
      }
    }
  } catch {
    // Supabase not configured
  }

  const planInfo = PLAN_LABELS[plan] ?? PLAN_LABELS.free;
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.free;
  const isPaid = ["monthly", "annual", "founder"].includes(plan);
  const isTrialActive = !!trialExpiresAt && new Date(trialExpiresAt) > new Date();

  const trialDaysLeft = trialExpiresAt
    ? Math.max(0, Math.ceil((new Date(trialExpiresAt).getTime() - Date.now()) / 86_400_000))
    : null;

  const periodEndFormatted = periodEnd
    ? new Date(periodEnd).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : null;

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
          <CardContent className="space-y-5">
            {/* Current plan */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-4">
              <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Current plan</p>
              <p className={`mt-1 text-2xl font-bold ${planInfo.color}`}>{planInfo.name}</p>
              <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{planInfo.price}</p>

              {isTrialActive && trialDaysLeft !== null && (
                <p className="mt-2 text-xs text-amber-600 font-medium">
                  Free trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining
                </p>
              )}
              {periodEndFormatted && (
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {plan === "free" ? "Access until" : "Renews"}: {periodEndFormatted}
                </p>
              )}

              <ul className="mt-3 space-y-1.5">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {isPaid && portalUrl ? (
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg-2)] transition-colors"
                >
                  Manage subscription
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary-hover)] transition-colors"
                >
                  {isTrialActive ? "Upgrade before trial ends" : "View plans"}
                  <ExternalLink className="h-4 w-4" />
                </Link>
              )}
            </div>

            <p className="text-xs text-[var(--muted-foreground)]">
              Invoice history is available in the Lemon Squeezy customer portal.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
