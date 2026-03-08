import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, Heart, Shield, Star, type LucideIcon } from "lucide-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveEntitlement, type EntitlementSubscription } from "@/lib/limits";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const STORY_CARDS: Array<{
  icon: LucideIcon;
  title: { en: string; ar: string };
  body: { en: string; ar: string };
}> = [
  {
    icon: Heart,
    title: {
      en: "You Took the Real Risk",
      ar: "أنتم من تحملتم المخاطرة الحقيقية",
    },
    body: {
      en: "Buying a lifetime plan before seeing a finished product takes conviction. You trusted the idea, not the screenshots. That kind of bet is rare and we don't take it lightly.",
      ar: "شراء خطة مدى الحياة قبل رؤية منتج مكتمل يتطلب قناعة حقيقية. لقد وثقتم في الفكرة لا في لقطات الشاشة. هذا النوع من الرهان نادر ولا نأخذه باستهانة.",
    },
  },
  {
    icon: Shield,
    title: {
      en: "Your Support Kept Development Running",
      ar: "دعمكم أبقى عجلة التطوير دائرة",
    },
    body: {
      en: "Early revenue is what lets an independent product stay independent. Every feature you see today — the Arabic RTL, the ZIP import, the family dashboard — exists because founding supporters made it financially viable to build.",
      ar: "الإيرادات المبكرة هي ما يتيح لمنتج مستقل أن يبقى مستقلاً. كل ميزة تراها اليوم — العربية والـ RTL واستيراد ZIP ولوحة العائلة — موجودة لأن الداعمين المؤسسين جعلوا تطويرها ممكناً من الناحية المالية.",
    },
  },
  {
    icon: Star,
    title: {
      en: "What You Get in Return",
      ar: "ما تحصلون عليه في المقابل",
    },
    body: {
      en: "Lifetime access. Every feature we ship, forever. Priority support. And the knowledge that when Fazumi grows — and it will — you were there at the start.",
      ar: "وصول مدى الحياة. كل ميزة نطلقها للأبد. دعم ذو أولوية. ومعرفة أنك عندما ينمو Fazumi — وسينمو — كنت هناك في البداية.",
    },
  },
];

export default async function FounderPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("fazumi_lang")?.value === "en" ? "en" : "ar";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, trial_expires_at")
      .eq("id", user.id)
      .maybeSingle<{ plan: string | null; trial_expires_at: string | null }>(),
    supabase
      .from("subscriptions")
      .select("plan_type, status, current_period_end, updated_at, created_at, ls_customer_portal_url, ls_update_payment_method_url, ls_subscription_id, ls_order_id")
      .eq("user_id", user.id),
  ]);

  const entitlement = resolveEntitlement({
    profile: {
      plan: profile?.plan ?? "free",
      trial_expires_at: profile?.trial_expires_at ?? null,
    },
    subscriptions: (subscriptions ?? []) as EntitlementSubscription[],
  });

  const isFounder = entitlement.billingPlan === "founder";
  const backHref = isFounder ? "/billing" : "/dashboard";

  return (
    <DashboardShell>
      <div
        dir={locale === "ar" ? "rtl" : "ltr"}
        lang={locale}
        className={cn("mx-auto max-w-2xl space-y-8 text-start", locale === "ar" && "font-arabic")}
      >
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            <ArrowLeft className={cn("h-4 w-4 shrink-0", locale === "ar" && "rotate-180")} />
            {isFounder ? (
              <LocalizedText en="Back to billing" ar="العودة إلى الفوترة" />
            ) : (
              <LocalizedText en="Back to dashboard" ar="العودة إلى اللوحة" />
            )}
          </Link>
        </div>

        <Card className="bg-[var(--surface-elevated)]">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-950">
                <Star className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-3xl)]">
                  <LocalizedText
                    en="The Founding Supporters of Fazumi"
                    ar="الداعمون المؤسسون لـ Fazumi"
                  />
                </h1>
                <p className="text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
                  <LocalizedText
                    en="A small group of people backed this product before it existed. This page is for them."
                    ar="مجموعة صغيرة من الناس دعمت هذا المنتج قبل أن يوجد. هذه الصفحة لهم."
                  />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {STORY_CARDS.map(({ icon: Icon, title, body }) => (
            <Card key={title.en} className="bg-[var(--surface-elevated)]">
              <CardHeader>
                <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary)]/10">
                  <Icon className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <CardTitle className="text-[var(--text-lg)]">
                  <LocalizedText en={title.en} ar={title.ar} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--text-sm)] leading-7 text-[var(--muted-foreground)]">
                  <LocalizedText en={body.en} ar={body.ar} />
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="surface-panel bg-[var(--surface-elevated)] px-6 py-6">
          <blockquote className="text-[var(--text-base)] italic leading-relaxed text-[var(--foreground)]">
            <LocalizedText
              en="Thank you. Genuinely. Building something people pay for before it is finished is one of the hardest tests a product can face. You helped us pass it."
              ar="شكراً لكم. حقاً. بناء شيء يدفع الناس ثمنه قبل اكتماله هو أحد أصعب الاختبارات التي يمكن أن يواجهها منتج. ساعدتمونا على اجتيازه."
            />
          </blockquote>
        </div>

        <div>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius)] bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-colors hover:bg-amber-600"
          >
            <LocalizedText en="Back to your dashboard" ar="العودة إلى لوحتك" />
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
