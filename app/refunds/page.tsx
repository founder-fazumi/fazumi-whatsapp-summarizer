import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { BILLING_CONTACT_EMAIL } from "@/lib/config/legal";

const SECTIONS = [
  {
    title: { en: "1. 14-day refund window", ar: "1. نافذة الاسترداد لمدة 14 يومًا" },
    body: {
      en: "Customers may request a refund within 14 days of the initial purchase date for Fazumi paid plans. This 14-day minimum applies to the first paid transaction that starts the plan.",
      ar: "يمكن للعملاء طلب استرداد المبلغ خلال 14 يومًا من تاريخ الشراء الأول للخطط المدفوعة في Fazumi. وينطبق هذا الحد الأدنى البالغ 14 يومًا على أول عملية دفع تبدأ الخطة.",
    },
  },
  {
    title: { en: "2. Cancellations and renewals", ar: "2. الإلغاء والتجديدات" },
    body: {
      en: "Monthly and annual subscriptions renew automatically until canceled. If you cancel, future renewals stop and your access continues through the current billing period. One-time founder purchases do not renew.",
      ar: "تتجدد الاشتراكات الشهرية والسنوية تلقائيًا حتى يتم إلغاؤها. وإذا قمت بالإلغاء، تتوقف التجديدات المستقبلية ويستمر وصولك حتى نهاية فترة الفوترة الحالية. أما مشتريات باقة المؤسسين ذات الدفعة الواحدة فلا تتجدد.",
    },
  },
  {
    title: { en: "3. How to request a refund", ar: "3. كيفية طلب الاسترداد" },
    bodyPrefix: {
      en: "Email",
      ar: "راسلنا عبر البريد الإلكتروني على",
    },
    contact: BILLING_CONTACT_EMAIL,
    bodySuffix: {
      en: 'with the subject line "Refund request" and include your registered email address. Eligible requests made within the refund window are handled according to the authorised payment partner or Merchant of Record standards shown at checkout and returned to the original payment method.',
      ar: "مع كتابة \"طلب استرداد\" في عنوان الرسالة، وأرفق عنوان بريدك الإلكتروني المسجل. وتتم معالجة الطلبات المؤهلة المقدمة خلال نافذة الاسترداد وفق معايير شريك الدفع المعتمد أو التاجر الرسمي الموضحة عند الدفع، وتُعاد إلى وسيلة الدفع الأصلية.",
    },
  },
] as const;

export default function RefundsPage() {
  return (
    <PublicPageShell
      eyebrow={{ en: "Legal", ar: "قانوني" }}
      title={{ en: "Refund Policy", ar: "سياسة الاسترداد" }}
      description={{
        en: "How Fazumi handles refunds, cancellations, and renewals for paid plans.",
        ar: "كيف يتعامل Fazumi مع الاسترداد والإلغاء والتجديدات للخطط المدفوعة.",
      }}
    >
      <div className="space-y-6 max-w-3xl">
        <p className="text-xs text-[var(--muted-foreground)]">
          <LocalizedText en="Last updated: March 2026" ar="آخر تحديث: مارس 2026" />
        </p>
        {SECTIONS.map((section) => (
          <section key={section.title.en}>
            <h2 className="mb-2 text-base font-semibold text-[var(--foreground)]">
              <LocalizedText en={section.title.en} ar={section.title.ar} />
            </h2>
            <p className="text-sm leading-7 text-[var(--muted-foreground)]">
              {"body" in section ? (
                <LocalizedText en={section.body.en} ar={section.body.ar} />
              ) : (
                <>
                  <LocalizedText en={section.bodyPrefix.en} ar={section.bodyPrefix.ar} />{" "}
                  <a
                    href={`mailto:${section.contact}`}
                    className="text-[var(--primary)] hover:underline"
                    dir="ltr"
                  >
                    {section.contact}
                  </a>{" "}
                  <LocalizedText en={section.bodySuffix.en} ar={section.bodySuffix.ar} />
                </>
              )}
            </p>
          </section>
        ))}
      </div>
    </PublicPageShell>
  );
}
