import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { LocalizedText } from "@/components/i18n/LocalizedText";

const SECTIONS = [
  {
    title: { en: "1. What we collect", ar: "1. ما الذي نجمعه" },
    body: {
      en: "We collect your email address, name, and OAuth profile picture when you sign up. We store the structured summaries your account generates (dates, tasks, links, questions). We collect basic usage data (number of summaries, plan tier) to enforce plan limits and improve the product.",
      ar: "نجمع عنوان بريدك الإلكتروني واسمك وصورة ملفك من OAuth عند التسجيل. ونحفظ الملخصات المنظمة التي ينشئها حسابك مثل التواريخ والمهام والروابط والأسئلة. كما نجمع بيانات استخدام أساسية مثل عدد الملخصات ونوع الخطة لتطبيق حدود الخطط وتحسين المنتج.",
    },
  },
  {
    title: { en: "2. What we do NOT store", ar: "2. ما الذي لا نقوم بحفظه" },
    body: {
      en: "We never store, log, or retain the raw chat text you paste or upload. Your WhatsApp messages are processed in memory and immediately discarded after the summary is generated.",
      ar: "نحن لا نحفظ ولا نسجل ولا نحتفظ أبدًا بنص المحادثة الخام الذي تقوم بلصقه أو رفعه. تتم معالجة رسائل واتساب في الذاكرة ثم يتم التخلص منها فور إنشاء الملخص.",
    },
  },
  {
    title: { en: "3. How we use your data", ar: "3. كيف نستخدم بياناتك" },
    body: {
      en: "Your data is used to deliver the service (generating and displaying summaries), enforce your plan limits, and send transactional emails (e.g. trial expiry reminders). We do not sell your data to third parties. We do not use your data for advertising.",
      ar: "نستخدم بياناتك لتقديم الخدمة مثل إنشاء الملخصات وعرضها، ولتطبيق حدود خطتك، ولإرسال الرسائل التشغيلية مثل تذكيرات انتهاء التجربة. نحن لا نبيع بياناتك لأي طرف ثالث، ولا نستخدم بياناتك للإعلانات.",
    },
  },
  {
    title: { en: "4. Data retention", ar: "4. الاحتفاظ بالبيانات" },
    body: {
      en: "Summaries are retained until you delete them or close your account. On account deletion, all summaries and profile data are permanently removed within 30 days.",
      ar: "يتم الاحتفاظ بالملخصات حتى تقوم بحذفها أو إغلاق حسابك. وعند حذف الحساب تتم إزالة جميع الملخصات وبيانات الملف الشخصي نهائيًا خلال 30 يومًا.",
    },
  },
  {
    title: { en: "5. Security", ar: "5. الأمان" },
    body: {
      en: "Data is stored in Supabase (hosted on AWS). Connections are encrypted via TLS. Row-level security policies ensure users can only access their own data. We do not have access to your OAuth passwords.",
      ar: "يتم تخزين البيانات في Supabase المستضاف على AWS. الاتصالات مشفرة عبر TLS. كما تضمن سياسات الأمان على مستوى الصفوف أن يتمكن كل مستخدم من الوصول إلى بياناته فقط. ولا يمكننا الوصول إلى كلمات مرور OAuth الخاصة بك.",
    },
  },
  {
    title: { en: "6. Children", ar: "6. الأطفال" },
    body: {
      en: "Fazumi is not directed at children under 13. If you believe a child under 13 has created an account, contact us and we will delete it promptly.",
      ar: "Fazumi غير موجه للأطفال دون سن 13 عامًا. وإذا كنت تعتقد أن طفلًا دون 13 عامًا أنشأ حسابًا، فتواصل معنا وسنقوم بحذفه بسرعة.",
    },
  },
  {
    title: { en: "7. Contact", ar: "7. التواصل" },
    body: {
      en: "For privacy questions or data deletion requests:",
      ar: "لأسئلة الخصوصية أو طلبات حذف البيانات:",
    },
    contact: "privacy@fazumi.app",
  },
] as const;

export default function PrivacyPage() {
  return (
    <PublicPageShell
      eyebrow={{ en: "Legal", ar: "قانوني" }}
      title={{ en: "Privacy Policy", ar: "سياسة الخصوصية" }}
      description={{ en: "How Fazumi handles your data.", ar: "كيف يتعامل Fazumi مع بياناتك." }}
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
              <LocalizedText en={section.body.en} ar={section.body.ar} />{" "}
              {"contact" in section && (
                <a href={`mailto:${section.contact}`} className="text-[var(--primary)] hover:underline">
                  {section.contact}
                </a>
              )}
            </p>
          </section>
        ))}
      </div>
    </PublicPageShell>
  );
}
