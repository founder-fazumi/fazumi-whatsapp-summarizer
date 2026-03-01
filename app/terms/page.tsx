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
  title: { en: "Terms of Service", ar: "شروط الخدمة" },
  description: {
    en: "The basic rules that apply when you use Fazumi.",
    ar: "القواعد الأساسية التي تنطبق عند استخدامك لـ Fazumi.",
  },
  lastUpdated: {
    en: `Last updated: ${LAST_UPDATED}`,
    ar: `آخر تحديث: ${LAST_UPDATED}`,
  },
  sections: [
    {
      title: { en: "1. Acceptance of terms", ar: "1. قبول الشروط" },
      body: {
        en: "By creating an account or using Fazumi, you agree to these Terms. If you do not agree, please do not use the service.",
        ar: "عند إنشاء حساب أو استخدام Fazumi فإنك توافق على هذه الشروط. وإذا لم توافق عليها، فالرجاء عدم استخدام الخدمة.",
      },
      items: { en: [], ar: [] },
      email: "",
    },
    {
      title: { en: "2. Accounts and eligibility", ar: "2. الحسابات والأهلية" },
      body: {
        en: "Fazumi is intended for parents, guardians, and other authorized adults who support a student.",
        ar: "الخدمة موجهة للآباء والأمهات وأولياء الأمور وغيرهم من البالغين المصرح لهم بمتابعة شؤون الطالب.",
      },
      items: {
        en: [
          "You must be legally able to enter a binding agreement where you live.",
          "You must provide accurate account information and keep it reasonably up to date.",
          "You are responsible for activity that happens through your account.",
        ],
        ar: [
          "يجب أن تكون مؤهلًا قانونيًا لإبرام اتفاق ملزم في المكان الذي تقيم فيه.",
          "كما يجب تقديم معلومات حساب دقيقة وتحديثها بشكل معقول عند الحاجة.",
          "وأنت مسؤول عن أي نشاط يتم عبر حسابك.",
        ],
      },
      email: "",
    },
    {
      title: { en: "3. Usage rules", ar: "3. قواعد الاستخدام" },
      body: {
        en: "You must use Fazumi in a lawful and responsible way.",
        ar: "يجب استخدام Fazumi بطريقة قانونية ومسؤولة.",
      },
      items: {
        en: [
          "Do not use the service for illegal, abusive, or harmful activity.",
          "Do not upload or share content that contains threats, malware, or material you are not allowed to use.",
          "Do not process chats you are not authorized to access.",
          "Do not interfere with the service, bypass limits, or misuse the product.",
        ],
        ar: [
          "عدم استخدام الخدمة لأي نشاط غير قانوني أو مسيء أو ضار.",
          "وعدم رفع أو مشاركة محتوى يتضمن تهديدًا أو برمجيات خبيثة أو مواد لا يحق لك استخدامها.",
          "وعدم معالجة محادثات لا تملك صلاحية الوصول إليها.",
          "كما يُمنع تعطيل الخدمة أو تجاوز الحدود أو إساءة استخدام المنتج.",
        ],
      },
      email: "",
    },
    {
      title: { en: "4. Raw chats are not stored", ar: "4. عدم حفظ المحادثات الخام" },
      body: {
        en: "The chat text you paste or upload is processed transiently to generate a summary and is not stored as part of your account history.",
        ar: "يتم التعامل مع نصوص المحادثات التي تلصقها أو ترفعها بشكل عابر لإنشاء الملخص، ولا يتم حفظ النص الخام ضمن سجل حسابك.",
      },
      items: {
        en: [
          "We do not store raw messages in the database.",
          "We save only the summary output and extracted structured items.",
        ],
        ar: [
          "نحن لا نحفظ الرسائل الخام في قاعدة البيانات.",
          "ونحتفظ فقط بناتج الملخص والعناصر المنظمة المستخرجة.",
        ],
      },
      email: "",
    },
    {
      title: { en: "5. AI summaries may contain errors", ar: "5. قد تحتوي الملخصات على أخطاء" },
      body: {
        en: "Fazumi uses AI to generate summaries. AI output may contain mistakes, omissions, or incorrect assumptions.",
        ar: "يعتمد Fazumi على الذكاء الاصطناعي في إنشاء الملخصات، وقد تتضمن المخرجات أخطاء أو سهوًا أو افتراضات غير دقيقة.",
      },
      items: {
        en: [
          "Verify important dates, homework, announcements, and policies with the school or teacher.",
          "Do not rely on Fazumi alone for urgent, legal, medical, or safety-critical decisions.",
        ],
        ar: [
          "تحقق من المواعيد والواجبات والإعلانات والسياسات المهمة مع المدرسة أو المعلم.",
          "ولا تعتمد على Fazumi وحده في القرارات العاجلة أو القانونية أو الطبية أو الحساسة للسلامة.",
        ],
      },
      email: "",
    },
    {
      title: { en: "6. Plans, subscriptions, and refunds", ar: "6. الخطط والاشتراكات والاسترداد" },
      body: {
        en: "Current plans and pricing are described in-product and may change over time.",
        ar: "يتم توضيح الخطط والأسعار الحالية داخل المنتج، وقد تتغير بمرور الوقت.",
      },
      items: {
        en: [
          "Free access currently includes a 7-day trial with up to 3 summaries per day, followed by any limited free access shown in-product.",
          "Monthly and annual plans renew automatically until canceled.",
          "Founder is a one-time purchase and does not renew.",
          "Refunds are available only for monthly and annual plans within 7 days of the first charge. Founder purchases are final.",
        ],
        ar: [
          "تشمل الخطة المجانية حاليًا فترة تجريبية لمدة 7 أيام بحد أقصى 3 ملخصات يوميًا، يليها أي استخدام مجاني محدود يظهر داخل المنتج.",
          "الخطتان الشهرية والسنوية اشتراكات متجددة تلقائيًا حتى يتم إلغاؤها.",
          "أما خطة Founder فهي شراء لمرة واحدة ولا تتجدد.",
          "ويُتاح طلب الاسترداد فقط للخطط الشهرية والسنوية خلال 7 أيام من أول عملية دفع. مشتريات Founder نهائية.",
        ],
      },
      email: "",
    },
    {
      title: { en: "7. Termination", ar: "7. الإنهاء" },
      body: {
        en: "We may suspend or end access if you violate these Terms or misuse the service.",
        ar: "يجوز لنا تعليق الوصول أو إنهاؤه إذا خالفت هذه الشروط أو أسأت استخدام الخدمة.",
      },
      items: {
        en: [
          "You may stop using Fazumi at any time.",
          "If you want your account deleted, contact support from your registered email address.",
        ],
        ar: [
          "يمكنك التوقف عن استخدام Fazumi في أي وقت.",
          "وإذا أردت حذف الحساب، فتواصل مع الدعم من بريدك الإلكتروني المسجل.",
        ],
      },
      email: "support@fazumi.app",
    },
    {
      title: { en: "8. Disclaimers", ar: "8. إخلاءات المسؤولية" },
      body: {
        en: 'Fazumi is provided "as is" and "as available". We may change features, limits, or availability without guaranteeing uninterrupted service.',
        ar: 'يتم تقديم Fazumi "كما هو" و"بحسب التوفر"، وقد نغيّر الميزات أو الحدود أو التوفر دون ضمان خدمة متواصلة بلا انقطاع.',
      },
      items: { en: [], ar: [] },
      email: "",
    },
    {
      title: { en: "9. Limitation of liability", ar: "9. حدود المسؤولية" },
      body: {
        en: "To the extent allowed by law, we are not liable for indirect, incidental, or consequential losses arising from your use of the service or your reliance on summary output.",
        ar: "إلى الحد الذي يسمح به القانون، لا نتحمل المسؤولية عن الأضرار غير المباشرة أو العرضية أو التبعية الناتجة عن استخدامك للخدمة أو اعتمادك على مخرجات الملخص.",
      },
      items: { en: [], ar: [] },
      email: "",
    },
    {
      title: { en: "10. Governing law", ar: "10. القانون الواجب التطبيق" },
      body: {
        en: "Your local jurisdiction may apply. These Terms should be read subject to any mandatory consumer rights that apply where you live.",
        ar: "قد تنطبق الولاية القضائية المحلية الخاصة بك. ويجب قراءة هذه الشروط بما لا ينتقص من أي حقوق استهلاكية إلزامية تسري في مكان إقامتك.",
      },
      items: { en: [], ar: [] },
      email: "",
    },
    {
      title: { en: "11. Changes and contact", ar: "11. التغييرات والتواصل" },
      body: {
        en: "We may update these Terms from time to time. If you continue using Fazumi after an updated version is posted, that use means you accept the revised Terms.",
        ar: "قد نحدّث هذه الشروط من وقت لآخر. ويعني استمرارك في استخدام Fazumi بعد نشر النسخة المحدثة أنك تقبل الشروط المعدلة.",
      },
      items: {
        en: ["Questions about these Terms can be sent to:"],
        ar: ["يمكن إرسال أي استفسار حول هذه الشروط إلى:"],
      },
      email: "support@fazumi.app",
    },
  ],
} as const;

export default function TermsPage() {
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
