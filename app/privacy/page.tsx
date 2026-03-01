"use client";

import { LocalizedText } from "@/components/i18n/LocalizedText";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { pick } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LAST_UPDATED = "2026-03-01";

const COPY = {
  eyebrow: { en: "Legal", ar: "قانوني" },
  title: { en: "Privacy Policy", ar: "سياسة الخصوصية" },
  description: {
    en: "What Fazumi processes, saves, and deletes when you use the product.",
    ar: "كيف يعالج Fazumi بياناتك، وماذا يحفظ، ومتى يتم الحذف.",
  },
  lastUpdated: {
    en: `Last updated: ${LAST_UPDATED}`,
    ar: `آخر تحديث: ${LAST_UPDATED}`,
  },
  sections: [
    {
      title: { en: "1. What Fazumi does", ar: "1. ماذا يفعل Fazumi" },
      body: {
        en: "Fazumi turns busy school-group messages into structured summaries so parents can quickly understand the important updates.",
        ar: "يساعد Fazumi أولياء الأمور على تحويل رسائل مجموعات المدرسة المزدحمة إلى ملخصات منظمة وواضحة تسهّل معرفة المهم بسرعة.",
      },
      items: {
        en: [
          "It summarizes pasted or uploaded school-group text.",
          "It highlights the TL;DR, dates, action items, people or classes, links, and follow-up questions.",
          "When you are signed in, it saves the generated summary to your account history.",
        ],
        ar: [
          "يلخّص نصوص مجموعات المدرسة التي تقوم بلصقها أو رفعها.",
          "يعرض خلاصة سريعة مع المواعيد والمهام والأشخاص أو الصفوف والروابط والأسئلة المقترحة للمتابعة.",
          "وعند تسجيل الدخول، يحفظ الملخص الناتج في سجل حسابك.",
        ],
      },
      email: "",
    },
    {
      title: { en: "2. What we store", ar: "2. ما الذي نحفظه" },
      body: {
        en: "We store only the data needed to run your account and show your saved results.",
        ar: "نحتفظ فقط بالبيانات اللازمة لتشغيل حسابك وعرض النتائج المحفوظة لك.",
      },
      items: {
        en: [
          "Account details such as your name, email, and sign-in provider information.",
          "Summary output generated for you.",
          "Extracted structured items such as dates, tasks, people or classes, links, and questions.",
          "Operational metadata such as timestamps, plan state, and character count.",
        ],
        ar: [
          "بيانات الحساب مثل الاسم والبريد الإلكتروني وبعض معلومات جهة تسجيل الدخول.",
          "نص الملخص النهائي الذي تم إنشاؤه لك.",
          "العناصر المنظمة المستخرجة مثل التواريخ والمهام والأشخاص أو الصفوف والروابط والأسئلة.",
          "بيانات تشغيل أساسية مثل وقت الإنشاء وحالة الخطة وعدد الأحرف.",
        ],
      },
      email: "",
    },
    {
      title: { en: "3. What we process transiently", ar: "3. ما الذي نعالجه بشكل عابر" },
      body: {
        en: "The chat text you paste or upload is handled only long enough to create the summary.",
        ar: "يتم التعامل مع نص المحادثة الذي تلصقه أو ترفعه لفترة قصيرة تكفي فقط لإنشاء الملخص.",
      },
      items: {
        en: [
          "Pasted text and uploaded text files are processed during the summarization request.",
          "We never persist raw chat text to our database.",
          "We do not store raw pasted chats or message bodies in product logs.",
        ],
        ar: [
          "تتم معالجة النصوص الملصقة أو الملفات النصية المرفوعة أثناء طلب التلخيص فقط.",
          "ولا نحفظ نص المحادثة الخام في قاعدة البيانات.",
          "كما أننا لا نخزن نصوص الرسائل الخام في سجلات المنتج.",
        ],
      },
      email: "",
    },
    {
      title: { en: "4. Service providers", ar: "4. مزودو الخدمة" },
      body: {
        en: "We use a limited set of providers to operate Fazumi. Each provider handles data only for its role in delivering the service.",
        ar: "نعتمد على عدد محدود من مزودي الخدمة لتشغيل Fazumi، ويعالج كل مزود البيانات في حدود دوره في تقديم الخدمة.",
      },
      items: {
        en: [
          "Supabase for authentication and database infrastructure.",
          "OpenAI for summarization.",
          "Sentry for error monitoring.",
          "Lemon Squeezy for checkout, subscriptions, and the customer billing portal.",
        ],
        ar: [
          "Supabase للمصادقة والبنية الأساسية لقاعدة البيانات.",
          "OpenAI لتوليد الملخصات.",
          "Sentry لمراقبة الأخطاء.",
          "Lemon Squeezy للدفع والاشتراكات وبوابة الفوترة الخاصة بالعميل.",
        ],
      },
      email: "",
    },
    {
      title: { en: "5. Retention and deletion", ar: "5. الاحتفاظ والحذف" },
      body: {
        en: "Saved summaries remain in your account until you delete them or ask us to remove your account.",
        ar: "تبقى الملخصات المحفوظة في حسابك إلى أن تحذفها أو تطلب منا إزالة الحساب.",
      },
      items: {
        en: [
          "If you delete a summary, we may keep a deletion marker such as deleted_at so it no longer appears in the product and can be handled by cleanup workflows.",
          "If you want your account deleted, email us from your registered address.",
          "Depending on your region, you may have rights to request access to or deletion of your data.",
        ],
        ar: [
          "عند حذف ملخص قد نحتفظ بعلامة حذف مثل deleted_at حتى يختفي من التطبيق وتتم معالجته ضمن إجراءات التنظيف الداخلية.",
          "وإذا أردت حذف الحساب بالكامل، فراسلنا من بريدك المسجل.",
          "وبحسب منطقتك، قد تتوفر لك حقوق لطلب الوصول إلى بياناتك أو حذفها.",
        ],
      },
      email: "support@fazumi.app",
    },
    {
      title: { en: "6. Security", ar: "6. الأمان" },
      body: {
        en: "We use reasonable technical and organizational measures designed to protect account data.",
        ar: "نستخدم إجراءات تقنية وتنظيمية معقولة تهدف إلى حماية بيانات الحساب.",
      },
      items: {
        en: [
          "Encrypted connections in transit.",
          "Access controls around stored account data.",
          "Operational monitoring to detect errors and service issues.",
          "No system is perfect, so avoid submitting highly sensitive information.",
        ],
        ar: [
          "تشفير الاتصالات أثناء النقل.",
          "ضوابط وصول على البيانات المخزنة.",
          "مراقبة تشغيلية لرصد الأعطال ومشكلات الخدمة.",
          "ولا يوجد نظام معصوم بالكامل، لذلك يُفضّل عدم مشاركة معلومات شديدة الحساسية.",
        ],
      },
      email: "",
    },
    {
      title: { en: "7. Children", ar: "7. الأطفال" },
      body: {
        en: "Fazumi is for parents and guardians, not for children to use directly.",
        ar: "Fazumi مخصص للآباء والأمهات وأولياء الأمور، وليس لاستخدام الأطفال مباشرة.",
      },
      items: {
        en: [
          "Do not submit sensitive personal data about children.",
          "Avoid sharing health details, government identifiers, or other highly sensitive information in pasted text.",
        ],
        ar: [
          "يرجى عدم إرسال بيانات شخصية حساسة عن الأطفال.",
          "وتجنّب مشاركة المعلومات الصحية أو أرقام الهوية أو أي تفاصيل شديدة الحساسية ضمن النص المرسل للتلخيص.",
        ],
      },
      email: "",
    },
    {
      title: { en: "8. Contact", ar: "8. التواصل" },
      body: {
        en: "For privacy questions, deletion requests, or general support, contact us at:",
        ar: "للاستفسارات المتعلقة بالخصوصية أو طلبات الحذف أو الدعم العام، تواصل معنا عبر:",
      },
      items: { en: [], ar: [] },
      email: "support@fazumi.app",
    },
    {
      title: { en: "9. Updates", ar: "9. التحديثات" },
      body: {
        en: "This is a general notice. We may update this policy from time to time to reflect product, legal, or operational changes.",
        ar: "هذه سياسة عامة، وقد نحدّثها من وقت لآخر بما يعكس تغييرات المنتج أو التشغيل أو المتطلبات القانونية.",
      },
      items: {
        en: ["If we make updates, we will post the revised version on this page."],
        ar: ["وعند إجراء تحديثات، سننشر النسخة المراجعة على هذه الصفحة."],
      },
      email: "",
    },
  ],
} as const;

export default function PrivacyPage() {
  const { locale } = useLang();
  const isArabic = locale === "ar";

  return (
    <PublicPageShell
      eyebrow={COPY.eyebrow}
      title={COPY.title}
      description={COPY.description}
    >
      <div
        dir={isArabic ? "rtl" : "ltr"}
        lang={locale}
        className="reading-shell space-y-4"
      >
        <p className={cn("text-xs text-[var(--muted-foreground)]", isArabic && "text-right")}>
          <LocalizedText en={COPY.lastUpdated.en} ar={COPY.lastUpdated.ar} />
        </p>

        {COPY.sections.map((section) => {
          const items = pick<readonly string[]>(section.items, locale);

          return (
            <Card key={section.title.en}>
              <CardHeader className={cn(isArabic && "text-right")}>
                <CardTitle>{pick(section.title, locale)}</CardTitle>
              </CardHeader>
              <CardContent className={cn("space-y-3", isArabic && "text-right")}>
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  {pick(section.body, locale)}
                </p>

                {items.length > 0 ? (
                  <ul
                    className={cn(
                      "list-disc space-y-2 text-sm leading-7 text-[var(--muted-foreground)]",
                      isArabic ? "pr-5" : "pl-5"
                    )}
                  >
                    {items.map((item) => (
                      <li key={`${section.title.en}-${item}`}>{item}</li>
                    ))}
                  </ul>
                ) : null}

                {section.email ? (
                  <a
                    href={`mailto:${section.email}`}
                    className="inline-flex text-sm font-medium text-[var(--primary)] hover:underline"
                  >
                    {section.email}
                  </a>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PublicPageShell>
  );
}
