import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { LocalizedText } from "@/components/i18n/LocalizedText";

const SECTIONS = [
  {
    title: { en: "1. Monthly & Annual subscriptions", ar: "1. الاشتراكات الشهرية والسنوية" },
    body: {
      en: "We offer a 7-day money-back guarantee on your first payment for monthly and annual plans. If you are not satisfied, contact us within 7 days of your first charge and we will issue a full refund. Subsequent renewals are not eligible for refunds.",
      ar: "نقدم ضمان استرداد لمدة 7 أيام على أول دفعة في الخطط الشهرية والسنوية. وإذا لم تكن راضيًا، فتواصل معنا خلال 7 أيام من أول عملية خصم وسنقوم برد المبلغ كاملًا. أما عمليات التجديد اللاحقة فلا تكون مؤهلة للاسترداد.",
    },
  },
  {
    title: { en: "2. Founder LTD", ar: "2. Founder LTD" },
    body: {
      en: "The Founder Lifetime Deal is a one-time purchase and is final sale. No refunds are offered for Founder LTD purchases. By completing the purchase you acknowledge and agree to this policy.",
      ar: "صفقة Founder مدى الحياة هي عملية شراء لمرة واحدة وتعد بيعًا نهائيًا. لا نقدم استردادًا لمشتريات Founder LTD. وبإتمام عملية الشراء فإنك تقر بهذه السياسة وتوافق عليها.",
    },
  },
  {
    title: { en: "3. How to request a refund", ar: "3. كيفية طلب الاسترداد" },
    bodyPrefix: {
      en: "Email",
      ar: "راسلنا عبر البريد الإلكتروني على",
    },
    contact: "billing@fazumi.app",
    bodySuffix: {
      en: 'with the subject line "Refund request" and include your registered email address. Refunds are processed within 5–10 business days to your original payment method.',
      ar: "مع كتابة \"طلب استرداد\" في عنوان الرسالة، وأرفق عنوان بريدك الإلكتروني المسجل. تتم معالجة الاستردادات خلال 5 إلى 10 أيام عمل إلى وسيلة الدفع الأصلية.",
    },
  },
] as const;

export default function RefundsPage() {
  return (
    <PublicPageShell
      eyebrow={{ en: "Legal", ar: "قانوني" }}
      title={{ en: "Refund Policy", ar: "سياسة الاسترداد" }}
      description={{ en: "Our 7-day money-back policy for monthly and annual plans.", ar: "ضمان الاسترداد لمدة 7 أيام على الخطط الشهرية والسنوية." }}
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
                  <a href={`mailto:${section.contact}`} className="text-[var(--primary)] hover:underline">
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
