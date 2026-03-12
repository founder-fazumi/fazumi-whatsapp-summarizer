"use client";

import Link from "next/link";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEGAL_CONTACT_EMAIL } from "@/lib/config/legal";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LAST_UPDATED = "2026-03-13";

interface PrivacySection {
  title: LocalizedCopy<string>;
  body: LocalizedCopy<string>;
  items?: LocalizedCopy<readonly string[]>;
  links?: readonly {
    href: string;
    label: LocalizedCopy<string>;
  }[];
  emails?: readonly string[];
}

const COPY = {
  eyebrow: { en: "Legal", ar: "قانوني" },
  title: { en: "Privacy Policy", ar: "سياسة الخصوصية" },
  description: {
    en: "What Fazumi collects, what it does not keep, and how data is used across the product.",
    ar: "ما الذي يجمعه Fazumi وما الذي لا يحتفظ به وكيف تُستخدم البيانات داخل المنتج.",
  },
  lastUpdated: {
    en: `Last updated: ${LAST_UPDATED}`,
    ar: `آخر تحديث: ${LAST_UPDATED}`,
  },
  sections: [
    {
      title: { en: "1. What we collect", ar: "1. ما الذي نجمعه" },
      body: {
        en: "We collect only the information we need to run Fazumi, secure accounts, save summaries, and support billing and compliance.",
        ar: "نحن نجمع فقط المعلومات اللازمة لتشغيل Fazumi وتأمين الحسابات وحفظ الملخصات ودعم الفوترة والامتثال.",
      },
      items: {
        en: [
          "Account data such as your name, email address, user ID, and sign-in provider details.",
          "Submitted content such as chat text or text files you send for summarization during a request.",
          "Saved summary cards and metadata such as the TL;DR, dates, action items, people or classes, links, questions, detected language, timestamps, and character count.",
          "Usage and plan data such as trial state, summary counters, subscription status, and product limits.",
          "Billing records provided by our authorised payment partner or Merchant of Record, including plan type, order or subscription IDs, renewal dates, and billing-portal links. We do not store full payment card details.",
          "Device, diagnostic, and compliance data such as IP address, user agent, consent records, basic security logs, and error monitoring data.",
        ],
        ar: [
          "بيانات الحساب مثل الاسم والبريد الإلكتروني ومعرف المستخدم وبيانات مزود تسجيل الدخول.",
          "المحتوى المرسل مثل نص المحادثة أو الملفات النصية التي ترسلها للتلخيص أثناء الطلب.",
          "بطاقات الملخص المحفوظة وبياناتها مثل الخلاصة السريعة والتواريخ والمهام والأشخاص أو الصفوف والروابط والأسئلة واللغة المكتشفة والطوابع الزمنية وعدد الأحرف.",
          "بيانات الاستخدام والخطة مثل حالة الفترة التجريبية وعدادات التلخيص وحالة الاشتراك وحدود المنتج.",
          "سجلات الفوترة التي يقدمها شريك الدفع المعتمد أو التاجر الرسمي، بما في ذلك نوع الخطة ومعرفات الطلب أو الاشتراك وتواريخ التجديد وروابط بوابة الفوترة. نحن لا نحفظ بيانات البطاقة الكاملة.",
          "بيانات الجهاز والتشخيص والامتثال مثل عنوان IP ومعرف المتصفح وسجلات الموافقة وبعض سجلات الأمان وبيانات مراقبة الأخطاء.",
        ],
      },
    },
    {
      title: { en: "2. How we use data", ar: "2. كيف نستخدم البيانات" },
      body: {
        en: "We use personal data to provide the service you asked for and to keep the product reliable and secure.",
        ar: "نستخدم البيانات الشخصية لتقديم الخدمة التي طلبتها وللحفاظ على موثوقية المنتج وأمانه.",
      },
      items: {
        en: [
          "To authenticate you, manage your account, and show your saved summary history.",
          "To send submitted chat text to OpenAI and return a summary card to you.",
          "To enforce usage limits, manage subscriptions, process billing events, and provide customer support.",
          "To detect abuse, prevent fraud, diagnose incidents, and monitor product health.",
          "To keep a record of privacy choices where consent logging is required.",
        ],
        ar: [
          "للمصادقة عليك وإدارة حسابك وعرض سجل الملخصات المحفوظة.",
          "لإرسال نص المحادثة المقدم إلى OpenAI وإرجاع بطاقة الملخص إليك.",
          "لتطبيق حدود الاستخدام وإدارة الاشتراكات ومعالجة أحداث الفوترة وتقديم الدعم.",
          "لكشف إساءة الاستخدام ومنع الاحتيال وتشخيص الحوادث ومراقبة صحة المنتج.",
          "للاحتفاظ بسجل لخيارات الخصوصية عندما يكون توثيق الموافقة مطلوبًا.",
        ],
      },
    },
    {
      title: { en: "3. Legal bases for processing", ar: "3. الأسس القانونية للمعالجة" },
      body: {
        en: "Where GDPR or similar laws apply, we rely on a small set of legal bases depending on the purpose of the processing.",
        ar: "عندما تنطبق اللائحة العامة لحماية البيانات أو قوانين مشابهة، فإننا نعتمد على مجموعة محدودة من الأسس القانونية بحسب غرض المعالجة.",
      },
      items: {
        en: [
          "Contract: to create your account, generate summaries, save history, and manage paid plans.",
          "Legitimate interests: to secure the service, prevent abuse, debug failures, improve reliability, and operate the business responsibly.",
          "Consent: for optional analytics, session replay, marketing-related tracking, and similar non-essential technologies.",
          "Legal obligation: where we must keep records, respond to lawful requests, or meet tax, accounting, or compliance duties.",
        ],
        ar: [
          "العقد: لإنشاء حسابك وإنشاء الملخصات وحفظ السجل وإدارة الخطط المدفوعة.",
          "المصلحة المشروعة: لتأمين الخدمة ومنع إساءة الاستخدام وتصحيح الأعطال وتحسين الموثوقية وتشغيل النشاط بشكل مسؤول.",
          "الموافقة: للتحليلات الاختيارية وتسجيل الجلسات والتتبع المرتبط بالتسويق والتقنيات غير الضرورية المشابهة.",
          "الالتزام القانوني: عندما يجب علينا حفظ السجلات أو الرد على الطلبات النظامية أو الوفاء بواجبات الضرائب أو المحاسبة أو الامتثال.",
        ],
      },
    },
    {
      title: { en: "4. Service providers", ar: "4. مزودو الخدمة" },
      body: {
        en: "We use a small set of service providers to operate Fazumi. Each provider processes data only for its role in delivering the service to us.",
        ar: "نستخدم مجموعة محدودة من مزودي الخدمة لتشغيل فازومي. ويعالج كل مزود البيانات فقط بالقدر اللازم لدوره في تقديم الخدمة لنا.",
      },
      items: {
        en: [
          "Supabase provides authentication and the primary database for account, summary, subscription, consent, and contact records.",
          "OpenAI processes submitted chat text during summarization requests.",
          "Sentry helps us monitor application errors and diagnose failures.",
          "PostHog may process analytics or session replay data only after your opt-in and only when those features are enabled.",
          "An authorised payment partner or Merchant of Record shown at checkout handles hosted checkout, subscriptions, invoices, and the billing portal.",
          "We do not sell your personal data.",
        ],
        ar: [
          "توفر Supabase المصادقة وقاعدة البيانات الأساسية لسجلات الحسابات والملخصات والاشتراكات والموافقات ورسائل التواصل.",
          "تعالج OpenAI نص المحادثة المرسل أثناء طلبات التلخيص.",
          "تساعدنا Sentry في مراقبة أخطاء التطبيق وتشخيص الأعطال.",
          "قد تعالج PostHog بيانات التحليلات أو تسجيل الجلسات فقط بعد موافقتك وفقط عندما تكون هذه الميزات مفعلة.",
          "يتولى شريك دفع معتمد أو تاجر رسمي يظهر عند الدفع عمليات الدفع المستضافة والاشتراكات والفواتير وبوابة الفوترة.",
          "نحن لا نبيع بياناتك الشخصية.",
        ],
      },
    },
    {
      title: { en: "5. International transfers", ar: "5. نقل البيانات دوليًا" },
      body: {
        en: "Our providers may process data in countries other than your own, including the United States and other places where they operate infrastructure.",
        ar: "قد يعالج مزودو الخدمة البيانات في دول خارج بلدك، بما في ذلك الولايات المتحدة وأماكن أخرى يشغلون فيها البنية التحتية.",
      },
      items: {
        en: [
          "When data is transferred internationally, we rely on provider safeguards, contractual commitments, and reasonable technical and organizational protections as applicable.",
          "By using Fazumi, you understand that your data may be processed where our providers operate.",
        ],
        ar: [
          "عندما يتم نقل البيانات دوليًا، فإننا نعتمد على الضمانات التي يقدمها المزودون والالتزامات التعاقدية ووسائل الحماية التقنية والتنظيمية المعقولة بحسب ما ينطبق.",
          "وباستخدام Fazumi، فإنك تفهم أن بياناتك قد تُعالج في الأماكن التي يعمل فيها مزودونا.",
        ],
      },
    },
    {
      title: { en: "6. Retention", ar: "6. الاحتفاظ بالبيانات" },
      body: {
        en: "We keep data for as long as we need it to provide the service, meet legal obligations, and resolve disputes.",
        ar: "نحتفظ بالبيانات طالما كانت لازمة لتقديم الخدمة أو الوفاء بالالتزامات القانونية أو حل النزاعات.",
      },
      items: {
        en: [
          "Raw chat text is processed during the summarization request and is not stored in our summaries database or account history.",
          "Saved summary cards remain in your account until you delete them or ask us to delete your account.",
          "Deleted summaries may leave limited deletion markers or backup traces for a short time while systems sync or recover.",
          "Subscription, billing, and accounting records may be retained for the period required by law or operational necessity.",
          "Diagnostic, monitoring, and security logs are retained for limited periods based on operational need.",
        ],
        ar: [
          "يتم التعامل مع نص المحادثة الخام أثناء طلب التلخيص ولا يتم حفظه في قاعدة بيانات الملخصات أو سجل الحساب.",
          "تبقى بطاقات الملخص المحفوظة في حسابك إلى أن تحذفها أو تطلب حذف حسابك.",
          "قد تترك الملخصات المحذوفة مؤشرات حذف محدودة أو آثار نسخ احتياطية لفترة قصيرة أثناء مزامنة الأنظمة أو الاستعادة.",
          "قد يتم الاحتفاظ بسجلات الاشتراك والفوترة والمحاسبة للمدة التي يفرضها القانون أو تقتضيها الحاجة التشغيلية.",
          "يتم الاحتفاظ بسجلات التشخيص والمراقبة والأمان لفترات محدودة بحسب الحاجة التشغيلية.",
        ],
      },
    },
    {
      title: { en: "7. Your rights", ar: "7. حقوقك" },
      body: {
        en: "Depending on where you live, you may have privacy rights over your personal data.",
        ar: "بحسب مكان إقامتك، قد تكون لديك حقوق خصوصية تتعلق ببياناتك الشخصية.",
      },
      items: {
        en: [
          "You may ask for access to the personal data we hold about you.",
          "You may ask us to correct inaccurate data, delete your account data, or provide a copy of eligible data in a portable format where applicable.",
          "You may object to certain processing or ask us to restrict it where the law gives you that right.",
          "You can withdraw consent for optional cookies and tracking at any time without affecting earlier lawful processing.",
          "You can delete individual saved summaries inside the product.",
        ],
        ar: [
          "يمكنك طلب الوصول إلى البيانات الشخصية التي نحتفظ بها عنك.",
          "ويمكنك طلب تصحيح البيانات غير الدقيقة أو حذف بيانات الحساب أو الحصول على نسخة من البيانات المؤهلة بصيغة قابلة للنقل حيثما ينطبق ذلك.",
          "ويمكنك الاعتراض على بعض أنواع المعالجة أو طلب تقييدها عندما يمنحك القانون هذا الحق.",
          "ويمكنك سحب الموافقة على ملفات الارتباط والتتبع الاختياري في أي وقت دون أن يؤثر ذلك على المعالجة السابقة التي كانت مشروعة.",
          "كما يمكنك حذف الملخصات المحفوظة الفردية من داخل المنتج.",
        ],
      },
      emails: [LEGAL_CONTACT_EMAIL],
    },
    {
      title: { en: "8. Cookies and tracking", ar: "8. ملفات الارتباط والتتبع" },
      body: {
        en: "Fazumi uses necessary cookies and similar browser storage for sign-in, consent handling, language, and app settings. Optional analytics and session replay stay off until you opt in where consent is required.",
        ar: "يستخدم Fazumi ملفات ارتباط ضرورية ووسائل تخزين متشابهة في المتصفح لتسجيل الدخول وإدارة الموافقة واللغة وإعدادات التطبيق. وتبقى التحليلات الاختيارية وتسجيل الجلسات متوقفة حتى توافق عليها عندما تكون الموافقة مطلوبة.",
      },
      links: [
        {
          href: "/cookie-policy",
          label: {
            en: "Read the Cookie Policy",
            ar: "اقرأ سياسة ملفات الارتباط",
          },
        },
      ],
    },
    {
      title: { en: "9. Security", ar: "9. الأمان" },
      body: {
        en: "We use reasonable technical and organizational measures designed to protect account data and saved summaries.",
        ar: "نستخدم إجراءات تقنية وتنظيمية معقولة تهدف إلى حماية بيانات الحساب والملخصات المحفوظة.",
      },
      items: {
        en: [
          "Encrypted connections in transit.",
          "Access controls around stored account and billing records.",
          "Operational monitoring and error detection tools.",
          "No service is perfectly secure, so please avoid sending unusually sensitive information in chat submissions.",
        ],
        ar: [
          "اتصالات مشفرة أثناء النقل.",
          "ضوابط وصول على سجلات الحساب والفوترة المخزنة.",
          "أدوات لمراقبة التشغيل ورصد الأخطاء.",
          "ولا توجد خدمة آمنة بالكامل، لذلك يُرجى تجنب إرسال معلومات شديدة الحساسية في المحادثات المرسلة.",
        ],
      },
    },
    {
      title: { en: "10. Children", ar: "10. الأطفال" },
      body: {
        en: "Fazumi is intended for parents, guardians, and other authorized adults. It is not directed to children.",
        ar: "Fazumi مخصص للآباء والأمهات وأولياء الأمور وغيرهم من البالغين المصرح لهم. وهو غير موجه إلى الأطفال.",
      },
      items: {
        en: [
          "Do not create accounts for children to use directly.",
          "Avoid submitting sensitive child information unless it is genuinely necessary for the summary you want.",
          "If you believe we have collected data from a child improperly, contact us and we will review the request.",
        ],
        ar: [
          "يرجى عدم إنشاء حسابات ليستخدمها الأطفال مباشرة.",
          "وتجنب إرسال معلومات حساسة تخص الأطفال إلا إذا كانت ضرورية فعلًا للملخص الذي تريده.",
          "وإذا كنت تعتقد أننا جمعنا بيانات من طفل بشكل غير صحيح، فتواصل معنا وسنراجع الطلب.",
        ],
      },
    },
    {
      title: { en: "11. Contact and updates", ar: "11. التواصل والتحديثات" },
      body: {
        en: "For privacy questions, access requests, deletion requests, or general support, contact us at the address below. We may update this policy from time to time and will post the revised version here.",
        ar: "للاستفسارات المتعلقة بالخصوصية أو طلبات الوصول أو الحذف أو الدعم العام، تواصل معنا على العنوان أدناه. وقد نحدّث هذه السياسة من وقت لآخر وسننشر النسخة المعدلة هنا.",
      },
      emails: [LEGAL_CONTACT_EMAIL],
    },
  ] satisfies readonly PrivacySection[],
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
          const items = section.items ? pick(section.items, locale) : [];
          const links = section.links ?? [];
          const emails = section.emails ?? [];

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

                {links.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {links.map((link) => (
                      <Link
                        key={`${section.title.en}-${link.href}`}
                        href={link.href}
                        className="inline-flex text-sm font-medium text-[var(--primary)] hover:underline"
                      >
                        {pick(link.label, locale)}
                      </Link>
                    ))}
                  </div>
                ) : null}

                {emails.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {emails.map((email) => (
                      <a
                        key={`${section.title.en}-${email}`}
                        href={`mailto:${email}`}
                        className="inline-flex text-sm font-medium text-[var(--primary)] hover:underline"
                        dir="ltr"
                      >
                        {email}
                      </a>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PublicPageShell>
  );
}
