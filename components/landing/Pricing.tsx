"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import { BILLING_CONTACT_EMAIL } from "@/lib/config/legal";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber, formatPrice } from "@/lib/format";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { paymentProviderApprovalNote, paymentsComingSoon } from "@/lib/payments-ui";
import { lsVariantIds, lsVariantsConfigured } from "@/lib/config/public";

type Billing = "monthly" | "yearly";

interface BasePlan {
  name: LocalizedCopy<string>;
  description: LocalizedCopy<string>;
  badge: LocalizedCopy<string> | null;
  featured: boolean;
  ctaText: LocalizedCopy<string>;
  features: LocalizedCopy<string>[];
}

interface FreePlan extends BasePlan {
  id: "free";
}

interface ProPlan extends BasePlan {
  id: "monthly";
  monthlyPrice: number;
  annualPrice: number;
  yearlyMonthlyPrice: number;
}

interface FounderPlan extends BasePlan {
  id: "founder";
  founderBadge: true;
  seatsLeft: number;
}

type Plan = FreePlan | ProPlan | FounderPlan;

const COPY = {
  eyebrow: { en: "Pricing", ar: "الأسعار", es: "Precios", "pt-BR": "Preços", id: "Harga" },
  title: { en: "Simple plans for busy parents.", ar: "خطط بسيطة لأولياء الأمور المشغولين.", es: "Planes simples para padres ocupados.", "pt-BR": "Planos simples para pais ocupados.", id: "Paket sederhana untuk orang tua yang sibuk." },
  subtitle: {
    en: "Start free. Upgrade to Pro when school weeks get busy. Founder is an optional early-supporter plan.",
    ar: "ابدأ مجانًا. انتقل إلى برو عندما تزدحم الأسابيع المدرسية. أما باقة المؤسسين فهي خطة دعم مبكر اختيارية.",
    es: "Comienza gratis. Pasa a Pro cuando las semanas escolares se pongan agitadas. El plan Fundador es un plan de apoyo anticipado opcional.",
    "pt-BR": "Comece grátis. Atualize para Pro quando as semanas escolares ficarem agitadas. O Fundador é um plano de suporte antecipado opcional.",
    id: "Mulai gratis. Tingkatkan ke Pro saat minggu-minggu sekolah mulai sibuk. Pendiri adalah paket pendukung awal opsional.",
  },
  monthlyToggle: { en: "Monthly", ar: "شهري", es: "Mensual", "pt-BR": "Mensal", id: "Bulanan" },
  yearlyToggle: { en: "Yearly", ar: "سنوي", es: "Anual", "pt-BR": "Anual", id: "Tahunan" },
  monthlySuffix: { en: "/mo", ar: "/شهريًا", es: "/mes", "pt-BR": "/mês", id: "/bln" },
  currentPlan: { en: "Current plan", ar: "الخطة الحالية", es: "Plan actual", "pt-BR": "Plano atual", id: "Paket saat ini" },
  foundingSupporter: { en: "Founding Supporter", ar: "عضو مؤسس", es: "Patrocinador fundador", "pt-BR": "Apoiador fundador", id: "Pendukung pendiri" },
  founderBilling: { en: "one-time founder plan", ar: "خطة مؤسس بدفعة واحدة", es: "plan fundador de pago único", "pt-BR": "plano fundador de pagamento único", id: "paket pendiri pembayaran sekali" },
  refundNote: {
    en: "Refund requests can be made within 14 days of the initial purchase date for paid plans.",
    ar: "يمكن طلب استرداد المبلغ خلال 14 يومًا من تاريخ الشراء الأول لأي خطة مدفوعة.",
    es: "Las solicitudes de reembolso pueden realizarse dentro de los 14 días posteriores a la fecha de compra inicial para planes de pago.",
    "pt-BR": "Solicitações de reembolso podem ser feitas dentro de 14 dias após a data de compra inicial para planos pagos.",
    id: "Permintaan pengembalian dana dapat diajukan dalam 14 hari setelah tanggal pembelian awal untuk paket berbayar.",
  },
  billingExplain: {
    en: "Monthly and annual plans renew automatically until cancelled. Cancellations stop future renewals.",
    ar: "تتجدد الخطط الشهرية والسنوية تلقائيًا حتى يتم إلغاؤها. ويؤدي الإلغاء إلى إيقاف التجديدات المستقبلية.",
    es: "Los planes mensuales y anuales se renuevan automáticamente hasta ser cancelados. Las cancelaciones detienen las renovaciones futuras.",
    "pt-BR": "Os planos mensais e anuais são renovados automaticamente até serem cancelados. Os cancelamentos interrompem as renovações futuras.",
    id: "Paket bulanan dan tahunan diperbarui secara otomatis hingga dibatalkan. Pembatalan menghentikan pembaruan berikutnya.",
  },
  billingHelp: { en: "Billing help", ar: "مساعدة الفوترة", es: "Ayuda de facturación", "pt-BR": "Ajuda de faturamento", id: "Bantuan penagihan" },
  proCtaPending: { en: "Email to reserve →", ar: "راسلنا للحجز", es: "Correo para reservar →", "pt-BR": "E-mail para reservar →", id: "Email untuk reservasi →" },
  founderCtaPending: { en: "Email to reserve →", ar: "راسلنا للحجز", es: "Correo para reservar →", "pt-BR": "E-mail para reservar →", id: "Email untuk reservasi →" },
  paymentsSoon: { en: "Payments launching soon — clicking opens your email", ar: "ستفتح المدفوعات قريبًا — النقر يفتح بريدك الإلكتروني", es: "Pagos próximamente — al hacer clic se abrirá tu correo", "pt-BR": "Pagamentos em breve — clicar abrirá seu e-mail", id: "Pembayaran segera hadir — klik untuk membuka email Anda" },
} satisfies Record<string, LocalizedCopy<string>>;

function getSeatsRemainingCopy(count: string): LocalizedCopy<string> {
  return {
    en: `${count} seats remaining`,
    ar: `${count} مقعدًا متبقيًا`,
  };
}

function getBilledAnnuallyCopy(amount: string): LocalizedCopy<string> {
  return {
    en: `${amount} billed annually`,
    ar: `${amount} تُدفع سنويًا`,
  };
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: { en: "Free", ar: "مجاني", es: "Gratis", "pt-BR": "Grátis", id: "Gratis" },
    description: {
      en: "Try Fazumi free. Keep 3 summaries after.",
      ar: "جرّب Fazumi مجانًا. احتفظ بـ 3 ملخصات بعد ذلك.",
      es: "Prueba Fazumi gratis. Conserva 3 resúmenes después.",
      "pt-BR": "Experimente o Fazumi grátis. Guarde 3 resumos depois.",
      id: "Coba Fazumi gratis. Simpan 3 ringkasan sesudahnya.",
    },
    badge: null,
    featured: false,
    ctaText: { en: "Start free", ar: "ابدأ مجانًا", es: "Comenzar gratis", "pt-BR": "Começar grátis", id: "Mulai gratis" },
    features: [
      { en: "7-day free trial", ar: "تجربة مجانية لمدة 7 أيام", es: "Prueba gratuita de 7 días", "pt-BR": "Teste grátis de 7 dias", id: "Uji coba gratis 7 hari" },
      { en: "3 summaries after trial", ar: "3 ملخصات بعد التجربة", es: "3 resúmenes después de la prueba", "pt-BR": "3 resumos após o teste", id: "3 ringkasan setelah uji coba" },
      { en: "Arabic and English output", ar: "مخرجات بالعربية والإنجليزية", es: "Salida en árabe e inglés", "pt-BR": "Saída em árabe e inglês", id: "Output bahasa Arab dan Inggris" },
      { en: "Saved history", ar: "سجل محفوظ", es: "Historial guardado", "pt-BR": "Histórico salvo", id: "Riwayat tersimpan" },
    ],
  },
  {
    id: "monthly",
    name: { en: "Pro", ar: "برو", es: "Pro", "pt-BR": "Pro", id: "Pro" },
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    yearlyMonthlyPrice: 8.33,
    description: {
      en: "50 summaries each day for busy school weeks.",
      ar: "50 ملخصًا كل يوم خلال الأسابيع المدرسية المزدحمة.",
      es: "50 resúmenes al día para semanas escolares ocupadas.",
      "pt-BR": "50 resumos por dia para semanas escolares agitadas.",
      id: "50 ringkasan setiap hari untuk minggu sekolah yang sibuk.",
    },
    badge: { en: "Most popular", ar: "الأكثر شيوعًا", es: "Más popular", "pt-BR": "Mais popular", id: "Paling populer" },
    featured: true,
    ctaText: { en: "Choose Pro", ar: "اختر برو", es: "Elegir Pro", "pt-BR": "Escolher Pro", id: "Pilih Pro" },
    features: [
      { en: "50 summaries each day", ar: "50 ملخصًا كل يوم", es: "50 resúmenes al día", "pt-BR": "50 resumos por dia", id: "50 ringkasan setiap hari" },
      { en: "Upload .txt and .zip exports", ar: "رفع ملفات .txt و .zip", es: "Cargar exportaciones .txt y .zip", "pt-BR": "Enviar exportações .txt e .zip", id: "Unggah ekspor .txt dan .zip" },
      { en: "Full summary history", ar: "سجل كامل للملخصات", es: "Historial completo de resúmenes", "pt-BR": "Histórico completo de resumos", id: "Riwayat ringkasan lengkap" },
      { en: "Priority support", ar: "دعم ذو أولوية", es: "Soporte prioritario", "pt-BR": "Suporte prioritário", id: "Dukungan prioritas" },
    ],
  },
  {
    id: "founder",
    name: { en: "Founder", ar: "باقة المؤسسين", es: "Fundador", "pt-BR": "Fundador", id: "Pendiri" },
    description: {
      en: "Optional early-supporter plan.",
      ar: "خطة دعم مبكر اختيارية.",
      es: "Plan de apoyo anticipado opcional.",
      "pt-BR": "Plano de suporte antecipado opcional.",
      id: "Paket pendukung awal opsional.",
    },
    badge: { en: "Founding Supporter", ar: "عضو مؤسس", es: "Patrocinador fundador", "pt-BR": "Apoiador fundador", id: "Pendukung pendiri" },
    featured: false,
    founderBadge: true,
    ctaText: { en: "Founder plan", ar: "خطة المؤسسين", es: "Plan Fundador", "pt-BR": "Plano Fundador", id: "Paket Pendiri" },
    features: [
      { en: "One-time payment", ar: "دفعة واحدة", es: "Pago único", "pt-BR": "Pagamento único", id: "Pembayaran sekali" },
      { en: "Founder recognition and priority support", ar: "تقدير المؤسس ودعم ذو أولوية", es: "Reconocimiento de fundador y soporte prioritario", "pt-BR": "Reconhecimento de fundador e suporte prioritário", id: "Pengakuan pendiri dan dukungan prioritas" },
      { en: "Early access to new features", ar: "وصول مبكر إلى الميزات الجديدة", es: "Acceso anticipado a nuevas funciones", "pt-BR": "Acesso antecipado a novos recursos", id: "Akses awal ke fitur baru" },
      { en: "Limited to 200 supporters", ar: "محدود بـ 200 داعم", es: "Limitado a 200 patrocinadores", "pt-BR": "Limitado a 200 apoiadores", id: "Dibatasi 200 pendukung" },
    ],
    seatsLeft: 200,
  },
];

interface PricingProps {
  isLoggedIn?: boolean;
  currentPlan?: "free" | "monthly" | "annual" | "founder";
  embedded?: boolean;
  sectionId?: string;
  headingTag?: "h1" | "h2";
}

export function Pricing({
  isLoggedIn = false,
  currentPlan,
  embedded = false,
  sectionId,
  headingTag = "h2",
}: PricingProps) {
  const { locale, siteLocale } = useLang();
  const [billing, setBilling] = useState<Billing>(() => (currentPlan === "monthly" ? "monthly" : "yearly"));
  const [founderSeatsLeft, setFounderSeatsLeft] = useState<number>(200);

  useEffect(() => {
    fetch("/api/public/founder-seats")
      .then((r) => r.json())
      .then((data: { remaining?: number }) => {
        if (typeof data.remaining === "number") {
          setFounderSeatsLeft(data.remaining);
        }
      })
      .catch(() => undefined);
  }, []);
  const HeadingTag = headingTag;
  const currentPlanId =
    currentPlan === "founder"
      ? "founder"
      : currentPlan === "free"
        ? "free"
        : currentPlan
          ? "monthly"
          : null;
  const visiblePlans =
    embedded && currentPlanId && currentPlanId !== "free"
      ? PLANS.filter((plan) => plan.id !== "free")
      : PLANS;

  return (
    <section
      id={sectionId}
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={siteLocale}
      className={cn(
        embedded
          ? "surface-panel-elevated scroll-mt-24 px-4 pb-8 pt-6 shadow-[var(--shadow-md)] sm:px-6"
          : "scroll-mt-24 bg-[var(--background)] py-[var(--page-section-space)]",
        locale === "ar" && "font-arabic"
      )}
    >
      <div className={cn("page-shell", embedded && "max-w-none px-0")}>
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
            {pick(COPY.eyebrow, siteLocale)}
          </p>
          <HeadingTag className="mt-3 text-[var(--text-2xl)] font-bold text-[var(--foreground)] sm:text-[var(--text-3xl)]">
            {pick(COPY.title, siteLocale)}
          </HeadingTag>
          <p className="mt-3 text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
            {pick(COPY.subtitle, siteLocale)}
          </p>

          <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] p-1 shadow-[var(--shadow-xs)]">
            {(["monthly", "yearly"] as Billing[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setBilling(value)}
                className={cn(
                  "min-h-11 rounded-full px-5 py-2 text-[var(--text-sm)] font-medium transition-colors",
                  billing === value
                    ? "bg-[var(--primary)] text-white shadow-[var(--shadow-xs)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                )}
              >
                {pick(value === "monthly" ? COPY.monthlyToggle : COPY.yearlyToggle, siteLocale)}
                {value === "yearly" && (
                  <span className="ml-2 rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[var(--text-xs)] font-bold text-[var(--primary)]">
                    -17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "grid grid-cols-1 gap-4 pt-3",
            visiblePlans.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"
          )}
        >
          {visiblePlans.map((plan) => {
            const isCurrentPlan = currentPlanId === plan.id;
            const ctaText =
              plan.id === "monthly" && paymentsComingSoon
                ? COPY.proCtaPending
                : plan.id === "founder" && paymentsComingSoon
                  ? COPY.founderCtaPending
                  : plan.ctaText;

            return (
              <div
                key={plan.id}
                data-testid={`pricing-plan-${plan.id}`}
                data-current-plan={isCurrentPlan ? "true" : "false"}
                className={cn(
                  "relative flex flex-col rounded-[var(--radius-xl)] border bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-sm)]",
                  plan.featured
                    ? "border-[var(--primary)] shadow-[var(--shadow-md)]"
                    : "border-[var(--border)]",
                  isCurrentPlan && currentPlanId !== "founder" && "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--page-layer)]",
                  isCurrentPlan && currentPlanId === "founder" && "border-[var(--accent-fox)] ring-2 ring-[var(--accent-fox)] ring-offset-2 ring-offset-[var(--page-layer)]"
                )}
              >
                {isCurrentPlan && (
                  <div
                    className={cn(
                      "absolute right-4 top-4 rounded-full border px-3 py-1 text-[var(--text-xs)] font-bold",
                      plan.featured
                        ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                        : plan.id === "founder"
                          ? "border-[var(--accent-fox)] bg-[var(--accent-cream)] text-[var(--accent-fox-deep)]"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--primary)]"
                    )}
                  >
                    {pick(COPY.currentPlan, siteLocale)}
                  </div>
                )}

                {plan.badge && (
                  <div
                    className={cn(
                      "absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1 text-[var(--text-xs)] font-bold shadow-[var(--shadow-xs)]",
                      plan.featured
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--accent-cream)] text-[var(--accent-fox-deep)]"
                    )}
                  >
                    {pick(plan.badge, siteLocale)}
                  </div>
                )}

                {"founderBadge" in plan && plan.founderBadge && (
                  <div className="mb-3 flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-[var(--accent-fox)] text-[var(--accent-fox)]" />
                    <span className="text-[var(--text-xs)] font-bold uppercase tracking-widest text-[var(--accent-fox-deep)]">
                      {pick(COPY.foundingSupporter, siteLocale)}
                    </span>
                  </div>
                )}

                <div className="mb-4 min-h-[4.5rem]">
                  <h3 className="text-[var(--text-xl)] font-bold leading-tight text-[var(--foreground)] sm:text-[var(--text-2xl)]">
                    {pick(plan.name, siteLocale)}
                  </h3>
                  <p className="mt-2 text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
                    {pick(plan.description, siteLocale)}
                  </p>
                </div>

                <div className="mb-5">
                  {plan.id === "free" ? (
                    <p className="text-[var(--text-4xl)] font-bold text-[var(--foreground)] sm:text-[var(--text-5xl)]">
                      {pick(plan.name, siteLocale)}
                    </p>
                  ) : plan.id === "founder" ? (
                    <div>
                      <p className="text-[var(--text-4xl)] font-bold text-[var(--foreground)] sm:text-[var(--text-5xl)]">
                        {formatPrice(149)}
                      </p>
                      <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                        {pick(COPY.founderBilling, siteLocale)}
                      </p>
                      {"seatsLeft" in plan && (
                        <p className="mt-1 text-[var(--text-xs)] font-semibold text-[var(--accent-fox-deep)]">
                          {pick(getSeatsRemainingCopy(formatNumber(founderSeatsLeft)), siteLocale)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-[var(--text-4xl)] font-bold text-[var(--foreground)] sm:text-[var(--text-5xl)]">
                        {formatPrice(billing === "yearly" ? plan.yearlyMonthlyPrice : plan.monthlyPrice, 2)}
                        <span className="ml-1 text-[var(--text-sm)] font-normal text-[var(--muted-foreground)]">
                          {pick(COPY.monthlySuffix, siteLocale)}
                        </span>
                      </p>
                      {billing === "yearly" && (
                        <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                          {pick(getBilledAnnuallyCopy(formatPrice(plan.annualPrice, 2)), siteLocale)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {isCurrentPlan ? (
                  <div
                    className={cn(
                      "mb-5 flex min-h-11 w-full items-center justify-center rounded-[var(--radius)] px-4 py-2.5 text-[var(--text-sm)] font-semibold",
                      plan.featured
                        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                        : plan.id === "founder"
                          ? "bg-[var(--accent-cream)] text-[var(--accent-fox-deep)]"
                          : "bg-[var(--surface-muted)] text-[var(--primary)]"
                    )}
                  >
                    {pick(COPY.currentPlan, siteLocale)}
                  </div>
                ) : plan.id === "free" ? (
                  <Link
                    href={isLoggedIn ? "/summarize" : "/login"}
                    className="mb-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-center text-[var(--text-sm)] font-medium text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
                  >
                    {pick(plan.ctaText, siteLocale)}
                  </Link>
                ) : (
                  <>
                    <CheckoutButton
                      variantId={
                        plan.id === "founder"
                          ? lsVariantIds.founder ?? ""
                          : billing === "yearly"
                            ? lsVariantIds.annual ?? ""
                            : lsVariantIds.monthly ?? ""
                      }
                      isLoggedIn={isLoggedIn}
                      className={cn(
                        paymentsComingSoon ? "mb-2" : "mb-5",
                        "inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 text-[var(--text-sm)] font-medium transition-colors",
                        plan.featured
                          ? "bg-[var(--primary)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
                          : plan.id === "founder"
                            ? "bg-[var(--accent-fox)] text-white shadow-[var(--shadow-sm)] hover:opacity-90"
                            : "bg-[var(--primary)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]",
                        "disabled:cursor-not-allowed disabled:opacity-70"
                      )}
                    >
                      {pick(ctaText, siteLocale)}
                    </CheckoutButton>
                    {paymentsComingSoon && (
                      <p className="mb-5 text-center text-[var(--text-xs)] text-[var(--muted-foreground)]">
                        {pick(COPY.paymentsSoon, siteLocale)}
                      </p>
                    )}
                  </>
                )}

                <ul className="flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature.en} className="flex items-start gap-2 text-[var(--text-base)]">
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          plan.id === "founder" ? "text-[var(--accent-fox-deep)]" : "text-[var(--primary)]"
                        )}
                      />
                      <span className="text-[var(--foreground)]">
                        {pick(feature, siteLocale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[var(--text-sm)] text-[var(--muted-foreground)]">
          {pick(COPY.refundNote, siteLocale)}
        </p>
        <p className="mt-2 text-center text-[var(--text-sm)] text-[var(--muted-foreground)]">
          {pick(COPY.billingExplain, siteLocale)}
        </p>
        {(paymentsComingSoon || !lsVariantsConfigured) ? (
          <p
            className="mt-2 text-center text-[var(--text-sm)] text-[var(--muted-foreground)]"
            role="status"
            aria-live="polite"
          >
            {pick(paymentProviderApprovalNote, siteLocale)}
            {" "}
            <a
              href={`mailto:${BILLING_CONTACT_EMAIL}`}
              className="font-medium text-[var(--primary)] hover:underline"
              dir="ltr"
            >
              {BILLING_CONTACT_EMAIL}
            </a>
            .
          </p>
        ) : (
          <p className="mt-2 text-center text-[var(--text-sm)] text-[var(--muted-foreground)]">
            {pick(COPY.billingHelp, siteLocale)}:{" "}
            <a
              href={`mailto:${BILLING_CONTACT_EMAIL}`}
              className="font-medium text-[var(--primary)] hover:underline"
              dir="ltr"
            >
              {BILLING_CONTACT_EMAIL}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
