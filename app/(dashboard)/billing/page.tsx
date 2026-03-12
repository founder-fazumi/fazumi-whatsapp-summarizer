import { DashboardShell } from "@/components/layout/DashboardShell";
import { BillingPlansPanel } from "@/components/billing/BillingPlansPanel";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { CreditCard, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCustomerPortalUrl } from "@/lib/lemonsqueezy";
import {
  resolveEntitlement,
  type EntitlementSubscription,
  type PlanKey,
} from "@/lib/limits";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";

const PLAN_LABELS: Record<PlanKey, { name: { en: string; ar: string }; price: { en: string; ar: string }; color: string }> = {
  free: {
    name: { en: "Free", ar: "مجاني" },
    price: { en: formatPrice(0), ar: formatPrice(0) },
    color: "text-[var(--muted-foreground)]",
  },
  monthly: {
    name: { en: "Pro Monthly", ar: "برو الشهري" },
    price: { en: `${formatPrice(9.99, 2)}/mo`, ar: `${formatPrice(9.99, 2)}/شهريًا` },
    color: "text-[var(--primary)]",
  },
  annual: {
    name: { en: "Pro Annual", ar: "برو السنوي" },
    price: { en: `${formatPrice(99.99, 2)}/yr`, ar: `${formatPrice(99.99, 2)}/سنويًا` },
    color: "text-[var(--primary)]",
  },
  founder: {
    name: { en: "Founder", ar: "باقة المؤسسين" },
    price: { en: formatPrice(149), ar: formatPrice(149) },
    color: "text-[var(--accent-fox-deep)]",
  },
};

const PLAN_FEATURES: Record<PlanKey, { en: string; ar: string }[]> = {
  free: [
    { en: "3 lifetime summaries", ar: "3 ملخصات مدى الحياة" },
    { en: "Summary history", ar: "سجل الملخصات" },
    { en: "EN + AR support", ar: "دعم العربية والإنجليزية" },
  ],
  monthly: [
    { en: "50 summaries / day", ar: "50 ملخصًا يوميًا" },
    { en: "200 / month", ar: "200 شهريًا" },
    { en: "Priority support", ar: "دعم ذو أولوية" },
    { en: "Full history", ar: "سجل كامل" },
  ],
  annual: [
    { en: "50 summaries / day", ar: "50 ملخصًا يوميًا" },
    { en: "200 / month", ar: "200 شهريًا" },
    { en: "Priority support", ar: "دعم ذو أولوية" },
    { en: "Full history", ar: "سجل كامل" },
    { en: "2 months free", ar: "شهران مجانًا" },
  ],
  founder: [
    { en: "50 summaries / day", ar: "50 ملخصًا يوميًا" },
    { en: "200 / month", ar: "200 شهريًا" },
    { en: "One-time founder plan", ar: "خطة مؤسس بدفعة واحدة" },
    { en: "Priority support and early feature access", ar: "دعم ذو أولوية ووصول مبكر للميزات" },
  ],
};

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  active: { en: "Active", ar: "نشط" },
  past_due: { en: "Payment issue", ar: "مشكلة دفع" },
  cancelled: { en: "Cancelled", ar: "ملغي" },
  expired: { en: "Expired", ar: "منتهي" },
};

export default async function BillingPage() {
  let isLoggedIn = false;
  let billingPlan: PlanKey = "free";
  let hasPaidAccess = false;
  let trialExpiresAt: string | null = null;
  let subscription: EntitlementSubscription | null = null;
  let portalUrl: string | null = null;
  let updatePaymentMethodUrl: string | null = null;
  let subscriptionStatus: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isLoggedIn = true;
      const [{ data: profile }, { data: subscriptions }] = await Promise.all([
        supabase
          .from("profiles")
          .select("plan, trial_expires_at")
          .eq("id", user.id)
          .maybeSingle<{ plan: string | null; trial_expires_at: string | null }>(),
        supabase
          .from("subscriptions")
          .select(
            "plan_type, status, current_period_end, updated_at, created_at, ls_customer_portal_url, ls_update_payment_method_url, ls_subscription_id, ls_order_id"
          )
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false }),
      ]);
      const subscriptionRows = (subscriptions ?? []) as EntitlementSubscription[];

      const entitlement = resolveEntitlement({
        profile: {
          plan: profile?.plan ?? "free",
          trial_expires_at: profile?.trial_expires_at ?? null,
        },
        subscriptions: subscriptionRows,
      });

      billingPlan = entitlement.billingPlan;
      hasPaidAccess = entitlement.hasPaidAccess;
      trialExpiresAt = profile?.trial_expires_at ?? null;
      subscription = subscriptionRows[0] ?? null;
      subscriptionStatus = entitlement.subscriptionStatus;
      updatePaymentMethodUrl =
        subscription?.ls_update_payment_method_url ??
        entitlement.updatePaymentMethodUrl;
      portalUrl =
        subscription?.ls_customer_portal_url ??
        entitlement.customerPortalUrl ??
        updatePaymentMethodUrl;

      if (!portalUrl && entitlement.subscriptionId) {
        portalUrl = await getCustomerPortalUrl(entitlement.subscriptionId);
      }
    }
  } catch {
    // Supabase not configured
  }

  const planInfo = PLAN_LABELS[billingPlan] ?? PLAN_LABELS.free;
  const features = PLAN_FEATURES[billingPlan] ?? PLAN_FEATURES.free;
  const isFounderPlan = billingPlan === "founder";
  const isTrialActive = !hasPaidAccess && !!trialExpiresAt && new Date(trialExpiresAt) > new Date();
  const statusLabel = subscriptionStatus ? STATUS_LABELS[subscriptionStatus] ?? null : null;

  const trialDaysLeft = trialExpiresAt
    ? Math.max(0, Math.ceil((new Date(trialExpiresAt).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <DashboardShell contentClassName="max-w-6xl">
      <div className="space-y-4">
        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <CreditCard className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-3xl)]">
                  <LocalizedText en="Billing" ar="الفوترة" />
                </h1>
                <CardDescription>
                  <LocalizedText en="Manage your subscription and billing" ar="أدر اشتراكك وفوترتك" />
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {subscription?.status === "past_due" && (
              <div className="rounded-[var(--radius-xl)] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  <LocalizedText
                    en="Your last payment failed. Update your payment method to keep your access."
                    ar="فشل آخر دفع. يرجى تحديث طريقة الدفع للحفاظ على وصولك."
                  />
                </p>
                {(updatePaymentMethodUrl ?? portalUrl) && (
                  <a
                    href={updatePaymentMethodUrl ?? portalUrl ?? "#"}
                    data-testid="billing-update-payment"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-amber-700 underline underline-offset-4 hover:no-underline dark:text-amber-400"
                  >
                    <LocalizedText en="Update payment method →" ar="← تحديث طريقة الدفع" />
                  </a>
                )}
              </div>
            )}
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                <LocalizedText en="Current plan" ar="الخطة الحالية" />
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p data-testid="billing-current-plan" className={`text-2xl font-bold ${planInfo.color}`}>
                  <LocalizedText en={planInfo.name.en} ar={planInfo.name.ar} />
                </p>
                {statusLabel && (
                  <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]">
                    <LocalizedText en={statusLabel.en} ar={statusLabel.ar} />
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                <LocalizedText en={planInfo.price.en} ar={planInfo.price.ar} />
              </p>

              {subscription?.current_period_end && subscription.status === "active" && (
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  <LocalizedText
                    en={`Renews ${formatDate(subscription.current_period_end, "en", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}`}
                    ar={`يتجدد في ${formatDate(subscription.current_period_end, "ar", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}`}
                  />
                </p>
              )}

              {subscription?.current_period_end && ["cancelled", "past_due"].includes(subscription.status ?? "") && (
                <p className="mt-2 text-xs text-[var(--destructive)]">
                  <LocalizedText
                    en={`Access until ${formatDate(subscription.current_period_end, "en", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}`}
                    ar={`الوصول حتى ${formatDate(subscription.current_period_end, "ar", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}`}
                  />
                </p>
              )}

              {subscription?.ls_customer_portal_url && (
                <a
                  href={subscription.ls_customer_portal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--primary)] underline-offset-4 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  <LocalizedText en="Manage billing →" ar="إدارة الفواتير ←" />
                </a>
              )}

              {isTrialActive && trialDaysLeft !== null && (
                <p className="mt-2 text-xs font-medium text-[var(--warning)]">
                  <LocalizedText
                    en={`Free trial. ${formatNumber(trialDaysLeft)} day${trialDaysLeft !== 1 ? "s" : ""} remaining`}
                    ar={`فترة تجريبية. متبقٍ ${formatNumber(trialDaysLeft)} يوم`}
                  />
                </p>
              )}

              <ul className="mt-3 space-y-1.5">
                {features.map((feature) => (
                  <li key={feature.en} className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <Check className="h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
                    <LocalizedText en={feature.en} ar={feature.ar} />
                  </li>
                ))}
              </ul>
            </div>

            {isFounderPlan && (
              <div className="rounded-[var(--radius-xl)] border border-amber-400 bg-amber-50 px-4 py-4 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                <p className="font-semibold">
                  <LocalizedText en="Your founder plan" ar="خطة المؤسس الخاصة بك" />
                </p>
                <p className="mt-1.5 leading-6 text-amber-900 dark:text-amber-100/90">
                  <LocalizedText
                    en="You are one of the early supporters who backed Fazumi. This is a one-time founder purchase, it does not renew, and founder-specific benefits follow the plan details shown at checkout."
                    ar="أنت من الداعمين الأوائل الذين دعموا Fazumi. هذه عملية شراء لمرة واحدة ضمن باقة المؤسسين، ولا تتجدد، وتخضع مزايا المؤسس للتفاصيل الموضحة عند الدفع."
                  />
                </p>
                <div className="mt-3">
                  <Link
                    href="/founder"
                    className="text-sm font-medium text-amber-700 underline underline-offset-2 dark:text-amber-300"
                  >
                    <LocalizedText en="Read our founding supporters story →" ar="← اقرأ قصة الداعمين المؤسسين" />
                  </Link>
                </div>
              </div>
            )}

            {!isFounderPlan && (
              <BillingPlansPanel
                isLoggedIn={isLoggedIn}
                plan={billingPlan}
                portalUrl={portalUrl}
              />
            )}

            <p className="text-xs text-[var(--muted-foreground)]">
              <LocalizedText
                en="Invoice history is available in the billing portal linked above when available."
                ar="سجل الفواتير متاح في بوابة الفوترة المرتبطة أعلاه عند توفرها."
              />
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
