"use client";

import { HelpCircle, Mail } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const MAX_UPLOAD_MB = formatNumber(10);
const MAX_CHARS = formatNumber(30_000);

const COPY = {
  eyebrow: { en: "Support", ar: "الدعم" },
  title: { en: "Help & Support", ar: "المساعدة والدعم" },
  description: {
    en: "Practical guidance for getting started, uploads, privacy, language, billing, and troubleshooting.",
    ar: "دليل عملي للبدء والرفع والخصوصية واللغة والفوترة ومعالجة المشكلات الشائعة.",
  },
  sections: [
    {
      title: { en: "Getting started", ar: "البدء" },
      body: {
        en: "Start by pasting school-group text into the summarize box or by uploading a supported export.",
        ar: "ابدأ بلصق نص محادثة المدرسة في مربع التلخيص أو برفع ملف مدعوم.",
      },
      items: {
        en: [
          "You can paste copied text from WhatsApp, Telegram, or Facebook Messenger.",
          "WhatsApp export .txt files are supported.",
          "You can also upload a .zip that contains text files only.",
        ],
        ar: [
          "يمكنك لصق النص المنسوخ من WhatsApp أو Telegram أو Facebook Messenger.",
          "كما يدعم Fazumi ملفات تصدير WhatsApp بصيغة .txt.",
          "ويمكنك أيضًا رفع ملف .zip يحتوي على ملفات نصية فقط.",
        ],
      },
    },
    {
      title: { en: "Uploads", ar: "الملفات المرفوعة" },
      body: {
        en: "Keep uploads focused and text-only so summarization stays reliable.",
        ar: "احرص على أن تكون الملفات المرفوعة مركزة ونصية فقط حتى يبقى التلخيص موثوقًا.",
      },
      items: {
        en: [
          `Maximum upload size: ${MAX_UPLOAD_MB}MB.`,
          `Maximum processed text length: ${MAX_CHARS} characters.`,
          "Media inside a zip is ignored.",
          "If a zip does not contain readable text, the summary request will fail.",
        ],
        ar: [
          `الحد الأقصى لحجم الرفع: ${MAX_UPLOAD_MB}MB.`,
          `الحد الأقصى للنص الذي تتم معالجته: ${MAX_CHARS} حرف.`,
          "ويتم تجاهل الصور والفيديو والوسائط داخل ملفات zip.",
          "وإذا لم يتضمن ملف zip نصًا مقروءًا فلن يكتمل طلب التلخيص.",
        ],
      },
    },
    {
      title: { en: "Privacy", ar: "الخصوصية" },
      body: {
        en: "Your raw chat text is processed transiently to generate the summary and is not stored in your account history.",
        ar: "يتم التعامل مع نص المحادثة الخام بشكل عابر لإنشاء الملخص، ولا يُحفَظ ضمن سجل حسابك.",
      },
      items: {
        en: [
          "Fazumi stores the summary output and structured extracted items only.",
          "Raw pasted chats are not saved to the database.",
          "If you contact support, avoid sending full raw chats unless absolutely necessary.",
        ],
        ar: [
          "ويحفظ Fazumi ناتج الملخص والعناصر المنظمة المستخرجة فقط.",
          "أما نصوص المحادثات الخام فلا يتم حفظها في قاعدة البيانات.",
          "وعند التواصل مع الدعم، تجنب إرسال المحادثة كاملة إلا إذا كان ذلك ضروريًا للغاية.",
        ],
      },
    },
    {
      title: { en: "Language", ar: "اللغة" },
      body: {
        en: "Summary language is controlled separately from the site UI language.",
        ar: "لغة الملخص يتم التحكم فيها بشكل منفصل عن لغة واجهة الموقع.",
      },
      items: {
        en: [
          "Auto follows the dominant language detected in the text.",
          "EN forces English summary output.",
          "AR forces Standard Arabic summary output.",
          "The site can stay in English while the summary is generated in Arabic, and vice versa.",
        ],
        ar: [
          "Auto يتبع اللغة الغالبة التي يكتشفها النظام داخل النص.",
          "EN يفرض إخراج الملخص باللغة الإنجليزية.",
          "AR يفرض إخراج الملخص بالعربية الفصحى.",
          "ويمكن أن تبقى واجهة الموقع بالإنجليزية بينما يُنشأ الملخص بالعربية، أو العكس.",
        ],
      },
    },
    {
      title: { en: "Billing", ar: "الفوترة" },
      body: {
        en: "Upgrade from the pricing page or manage your plan from the billing page when you are signed in.",
        ar: "يمكنك الترقية من صفحة التسعير أو إدارة خطتك من صفحة الفوترة بعد تسجيل الدخول.",
      },
      items: {
        en: [
          "Use /pricing to choose a plan and /billing to manage it later.",
          "If a subscription becomes past_due, paid access may be interrupted until payment details are updated.",
          "Monthly and annual plans are eligible for a refund request within 7 days of the first charge only. Founder is final sale.",
        ],
        ar: [
          "استخدم /pricing لاختيار الخطة و /billing لإدارتها لاحقًا.",
          "وإذا أصبحت حالة الاشتراك past_due فقد تتأثر المزايا المدفوعة إلى أن يتم تحديث بيانات الدفع.",
          "أما الاسترداد فهو متاح فقط للخطط الشهرية والسنوية خلال 7 أيام من أول عملية دفع. وخطة Founder بيع نهائي.",
        ],
      },
    },
  ],
  troubleshooting: {
    title: { en: "Troubleshooting", ar: "استكشاف المشكلات" },
    body: {
      en: "Try these first if something is not working as expected.",
      ar: "جرّب هذه الخطوات أولًا إذا لم يعمل شيء كما تتوقع.",
    },
    items: [
      {
        question: {
          en: "I cannot sign in",
          ar: "لا أستطيع تسجيل الدخول",
        },
        answer: {
          en: "Retry with the same sign-in provider, allow pop-ups if your browser blocks them, and then contact support if the issue continues.",
          ar: "أعد المحاولة باستخدام نفس جهة تسجيل الدخول، واسمح بالنوافذ المنبثقة إذا كان المتصفح يحظرها، ثم تواصل مع الدعم إذا استمرت المشكلة.",
        },
      },
      {
        question: {
          en: "The summary request failed",
          ar: "فشل طلب التلخيص",
        },
        answer: {
          en: "Shorten very long text, remove unsupported files, and try again. Zip uploads must contain readable text only.",
          ar: "قصّر النص إذا كان طويلًا جدًا، وأزل الملفات غير المدعومة، ثم أعد المحاولة. ويجب أن يحتوي ملف zip على نص قابل للقراءة فقط.",
        },
      },
      {
        question: {
          en: "I reached my limits",
          ar: "وصلت إلى الحد المسموح",
        },
        answer: {
          en: "Daily or free-plan limits can block new summaries. Upgrade on the pricing page or wait for the next daily reset if your plan includes one.",
          ar: "قد تمنعك الحدود اليومية أو حدود الخطة المجانية من إنشاء ملخصات جديدة. يمكنك الترقية من صفحة التسعير أو انتظار إعادة الضبط اليومية التالية إذا كانت خطتك تسمح بذلك.",
        },
      },
      {
        question: {
          en: "I still need help",
          ar: "ما زلت بحاجة إلى مساعدة",
        },
        answer: {
          en: "Email support@fazumi.app with your account email, a short description, and a screenshot if useful. Do not include full raw chats unless absolutely necessary.",
          ar: "راسل support@fazumi.app مع بريد حسابك ووصف مختصر للمشكلة ولقطة شاشة إن كانت مفيدة. ولا ترسل المحادثة الخام كاملة إلا إذا كان ذلك ضروريًا للغاية.",
        },
      },
    ],
  },
  support: {
    title: { en: "Contact support", ar: "تواصل مع الدعم" },
    body: {
      en: "For billing, account, or product questions:",
      ar: "للاستفسارات المتعلقة بالفوترة أو الحساب أو المنتج:",
    },
    email: "support@fazumi.app",
  },
} as const;

export default function HelpPage() {
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
        className="space-y-4"
      >
        <div className="grid gap-4 lg:grid-cols-2">
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
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader className={cn(isArabic && "text-right")}>
            <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse")}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <HelpCircle className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <CardTitle>{pick(COPY.troubleshooting.title, locale)}</CardTitle>
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  {pick(COPY.troubleshooting.body, locale)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion
              items={COPY.troubleshooting.items.map((item) => ({
                question: pick(item.question, locale),
                answer: pick(item.answer, locale),
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className={cn("py-5", isArabic && "text-right")}>
            <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse")}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <Mail className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  <LocalizedText en={COPY.support.title.en} ar={COPY.support.title.ar} />
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  <LocalizedText en={COPY.support.body.en} ar={COPY.support.body.ar} />
                </p>
                <a
                  href={`mailto:${COPY.support.email}`}
                  className="text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  {COPY.support.email}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  );
}
