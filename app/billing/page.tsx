import { DashboardShell } from "@/components/layout/DashboardShell";
import { BillingPlansPanel } from "@/components/billing/BillingPlansPanel";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, Check, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCustomerPortalUrl } from "@/lib/lemonsqueezy";
import type { Profile } from "@/lib/supabase/types";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";

const PLAN_LABELS: Record<string, { name: { en: string; ar: string }; price: string; color: string }> = {
  free:    { name: { en: "Free", ar: "مجاني" },          price: formatPrice(0),       color: "text-[var(--muted-foreground)]" },
  monthly: { name: { en: "Pro Monthly", ar: "Pro شهري" }, price: `${formatPrice(9.99, 2)}/mo`, color: "text-[var(--primary)]" },
  annual:  { name: { en: "Pro Annual", ar: "Pro سنوي" },  price: `${formatPrice(99.99, 2)}/yr`, color: "text-[var(--primary)]" },
  founder: { name: { en: "Founder LTD", ar: "المؤسس" },   price: formatPrice(149),     color: "text-[var(--accent-fox-deep)]" },
};

const PLAN_FEATURES: Record<string, { en: string; ar: string }[]> = {
  free: [
    { en: "3 lifetime summaries", ar: "3 ملخصات مدى الحياة" },
    { en: "Summary history", ar: "سجل الملخصات" },
    { en: "EN + AR support", ar: "دعم العربية والإنجليزية" },
  ],
  monthly: [
    { en: "50 summaries / day", ar: "50 ملخصًا يوميًا" },
    { en: "200 / month", ar: "200 شهريًا" },
    { en: "Priority support", ar: "دعم أولوية" },
    { en: "Full history", ar: "سجل كامل" },
  ],
  annual: [
    { en: "50 summaries / day", ar: "50 ملخصًا يوميًا" },
    { en: "200 / month", ar: "200 شهريًا" },
    { en: "Priority support", ar: "دعم أولوية" },
    { en: "Full history", ar: "سجل كامل" },
    { en: "2 months free", ar: "شهران مجانًا" },
  ],
  founder: [
    { en: "50 summaries / day", ar: "50 ملخصًا يوميًا" },
    { en: "200 / month", ar: "200 شهريًا" },
    { en: "Lifetime access", ar: "وصول مدى الحياة" },
    { en: "All future features", ar: "كل الميزات المستقبلية" },
  ],
};

export default async function BillingPage() {
  let isLoggedIn = false;
  let plan = "free";
  let trialExpiresAt: string | null = null;
  let portalUrl: string | null = null;
  let pastDuePortalUrl: string | null = null;
  let periodEnd: string | null = null;
  let isPastDue = false;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      isLoggedIn = true;
      const [{ data: profile }, { data: sub }] = await Promise.all([
        supabase
          .from("profiles")
          .select("plan, trial_expires_at")
          .eq("id", user.id)
          .single<Pick<Profile, "plan" | "trial_expires_at">>(),
        supabase
          .from("subscriptions")
          .select(
            "ls_subscription_id, status, current_period_end, ls_customer_portal_url, ls_update_payment_method_url"
          )
          .eq("user_id", user.id)
          .in("status", ["active", "cancelled", "past_due"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<{
            ls_subscription_id: string | null;
            status: string;
            current_period_end: string | null;
            ls_customer_portal_url: string | null;
            ls_update_payment_method_url: string | null;
          }>(),
      ]);

      plan = profile?.plan ?? "free";
      trialExpiresAt = profile?.trial_expires_at ?? null;
      periodEnd = sub?.current_period_end ?? null;
      isPastDue = sub?.status === "past_due";
      portalUrl = sub?.ls_customer_portal_url ?? sub?.ls_update_payment_method_url ?? null;
      pastDuePortalUrl = sub?.ls_update_payment_method_url ?? sub?.ls_customer_portal_url ?? null;

      if (!portalUrl && sub?.ls_subscription_id) {
        portalUrl = await getCustomerPortalUrl(sub.ls_subscription_id);
      }

      if (!pastDuePortalUrl) {
        pastDuePortalUrl = portalUrl;
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

  const periodEndEn = periodEnd ? formatDate(periodEnd, "en", { year: "numeric", month: "long", day: "numeric" }) : null;
  const periodEndAr = periodEnd ? formatDate(periodEnd, "ar", { year: "numeric", month: "long", day: "numeric" }) : null;

  return (
    <DashboardShell contentClassName="max-w-6xl">
      <div className="space-y-4">
        {isPastDue && (
          <div className="status-destructive flex items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p>
                <LocalizedText
                  en="Your last payment failed. Please update your payment method in the customer portal to avoid losing access."
                  ar="فشل آخر دفع. يرجى تحديث طريقة الدفع في بوابة العملاء لتجنب فقدان الوصول."
                />
              </p>
              {pastDuePortalUrl ? (
                <a
                  href={pastDuePortalUrl}
                  className="font-semibold underline underline-offset-2"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <LocalizedText en="Update payment →" ar="تحديث الدفع ←" />
                </a>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)]">
                  <LocalizedText
                    en="Portal link unavailable — try again in a minute (we refresh after webhook updates)."
                    ar="رابط البوابة غير متاح حاليًا — حاول مرة أخرى بعد دقيقة (نحدّثه بعد تحديثات webhook)."
                  />
                </p>
              )}
            </div>
          </div>
        )}
        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <CreditCard className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <CardTitle>
                  <LocalizedText en="Billing" ar="الفوترة" />
                </CardTitle>
                <CardDescription>
                  <LocalizedText en="Manage your subscription and invoices" ar="أدر اشتراكك وفواتيرك" />
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Current plan */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]">
              <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                <LocalizedText en="Current plan" ar="الخطة الحالية" />
              </p>
              <p className={`mt-1 text-2xl font-bold ${planInfo.color}`}>
                <LocalizedText en={planInfo.name.en} ar={planInfo.name.ar} />
              </p>
              <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{planInfo.price}</p>

              {isTrialActive && trialDaysLeft !== null && (
                <p className="mt-2 text-xs font-medium text-[var(--warning)]">
                  <LocalizedText
                    en={`Free trial. ${formatNumber(trialDaysLeft)} day${trialDaysLeft !== 1 ? "s" : ""} remaining`}
                    ar={`فترة تجريبية. متبقٍ ${formatNumber(trialDaysLeft)} يوم`}
                  />
                </p>
              )}
              {periodEndEn && periodEndAr && (
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {plan === "free" ? (
                    <LocalizedText en={`Access until: ${periodEndEn}`} ar={`الوصول حتى: ${periodEndAr}`} />
                  ) : (
                    <LocalizedText en={`Renews: ${periodEndEn}`} ar={`يتجدد: ${periodEndAr}`} />
                  )}
                </p>
              )}

              <ul className="mt-3 space-y-1.5">
                {features.map((f) => (
                  <li key={f.en} className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <Check className="h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
                    <LocalizedText en={f.en} ar={f.ar} />
                  </li>
                ))}
              </ul>
            </div>

            <BillingPlansPanel
              isLoggedIn={isLoggedIn}
              plan={plan as "free" | "monthly" | "annual" | "founder"}
              portalUrl={isPaid ? portalUrl : null}
            />

            <p className="text-xs text-[var(--muted-foreground)]">
              <LocalizedText
                en="Invoice history is available in the Lemon Squeezy customer portal."
                ar="سجل الفواتير متاح في بوابة عملاء Lemon Squeezy."
              />
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
