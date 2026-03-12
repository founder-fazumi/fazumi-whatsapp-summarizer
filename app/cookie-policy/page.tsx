"use client";

import Link from "next/link";
import { BarChart3, Megaphone, Settings2, ShieldCheck } from "lucide-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEGAL_CONTACT_EMAIL } from "@/lib/config/legal";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LAST_UPDATED = "2026-03-13";

interface CookieSection {
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
  title: { en: "Cookie Policy", ar: "سياسة ملفات الارتباط" },
  description: {
    en: "How Fazumi uses cookies and browser storage for sign-in, preferences, and optional analytics.",
    ar: "كيف يستخدم فازومي ملفات الارتباط وتخزين المتصفح لتسجيل الدخول والتفضيلات والتحليلات الاختيارية.",
  },
  lastUpdated: {
    en: `Last updated: ${LAST_UPDATED}`,
    ar: `آخر تحديث: ${LAST_UPDATED}`,
  },
  categories: [
    {
      title: { en: "Strictly necessary", ar: "ضرورية للغاية" },
      body: {
        en: "Needed for sign-in, session security, consent handling, and core product functionality. These do not require consent.",
        ar: "مطلوبة لتسجيل الدخول وأمان الجلسة وإدارة الموافقة والوظائف الأساسية للمنتج. وهذه الفئة لا تتطلب موافقة.",
      },
      icon: ShieldCheck,
    },
    {
      title: { en: "Preferences", ar: "التفضيلات" },
      body: {
        en: "Used to remember choices such as language and theme. These may use cookies or local storage depending on the feature.",
        ar: "تُستخدم لتذكر اختياراتك مثل اللغة والمظهر. وقد تعتمد على ملفات ارتباط أو تخزين محلي بحسب الميزة.",
      },
      icon: Settings2,
    },
    {
      title: { en: "Analytics", ar: "التحليلات" },
      body: {
        en: "When enabled and consented to, analytics help us understand page views, clicks, and product usage trends. These require consent.",
        ar: "عند تفعيلها وبعد الحصول على الموافقة، تساعدنا التحليلات على فهم مشاهدات الصفحات والنقرات واتجاهات استخدام المنتج. وهذه الفئة تتطلب موافقة.",
      },
      icon: BarChart3,
    },
    {
      title: { en: "Marketing", ar: "التسويق" },
      body: {
        en: "Fazumi does not currently use first-party marketing cookies on the main app. If that changes, we will ask first where consent is required.",
        ar: "لا يستخدم فازومي حاليًا ملفات تسويق من الطرف الأول على التطبيق الرئيسي. وإذا تغير ذلك، فسنطلب الموافقة أولًا عندما تكون مطلوبة.",
      },
      icon: Megaphone,
    },
  ],
  sections: [
    {
      title: { en: "1. What cookies are", ar: "1. ما هي ملفات الارتباط" },
      body: {
        en: "Cookies are small files placed in your browser. Fazumi also uses similar browser storage, such as localStorage, to remember language, theme, consent choices, and optional analytics settings.",
        ar: "ملفات الارتباط هي ملفات صغيرة تُحفظ في متصفحك. كما يستخدم فازومي وسائل تخزين مشابهة في المتصفح مثل localStorage لتذكر اللغة والمظهر وخيارات الموافقة وإعدادات التحليلات الاختيارية.",
      },
    },
    {
      title: { en: "2. Categories we use today", ar: "2. الفئات التي نستخدمها حاليًا" },
      body: {
        en: "Fazumi mainly uses necessary storage for sign-in, consent handling, language, and saved preferences. Optional analytics storage is used only if you opt in and analytics is enabled in the app configuration.",
        ar: "يعتمد فازومي أساسًا على التخزين الضروري لتسجيل الدخول وإدارة الموافقة واللغة والتفضيلات المحفوظة. ويتم استخدام التخزين الخاص بالتحليلات فقط إذا وافقت عليه وكانت التحليلات مفعلة في إعدادات التطبيق.",
      },
      items: {
        en: [
          "Strictly necessary storage keeps sign-in, session continuity, security, and your privacy choices working.",
          "Preference storage remembers language and theme selections.",
          "Analytics and session replay stay off until you opt in where consent is required.",
          "Marketing storage is not currently used by Fazumi on the main app.",
        ],
        ar: [
          "يحافظ التخزين الضروري للغاية على تسجيل الدخول واستمرار الجلسة والأمان وخيارات الخصوصية الخاصة بك.",
          "يتذكر تخزين التفضيلات اختيارات اللغة والمظهر.",
          "تبقى التحليلات وتسجيل الجلسات متوقفة حتى توافق عليها عندما تكون الموافقة مطلوبة.",
          "لا يستخدم فازومي حاليًا تخزين التسويق على التطبيق الرئيسي.",
        ],
      },
    },
    {
      title: { en: "3. High-level examples", ar: "3. أمثلة عامة" },
      body: {
        en: "The examples below are illustrative only, not an exhaustive list. Cookie and storage-key names may vary by configuration, provider version, browser, or environment.",
        ar: "الأمثلة التالية توضيحية فقط وليست قائمة حصرية. وقد تختلف أسماء ملفات الارتباط ومفاتيح التخزين بحسب الإعدادات أو إصدار المزود أو المتصفح أو البيئة.",
      },
      items: {
        en: [
          "Necessary examples: sign-in or session storage from Supabase, consent state, and security-related storage.",
          "Preference examples: language and theme choices stored in cookies or local storage.",
          "Optional analytics examples: PostHog identifiers or replay settings only after you opt in and only if those features are enabled.",
          "Hosted billing examples: the authorised payment partner or Merchant of Record shown at checkout may use its own cookies on checkout, invoice, or billing-portal pages it hosts.",
        ],
        ar: [
          "أمثلة الفئة الضرورية: تخزين تسجيل الدخول أو الجلسة من Supabase، وحالة الموافقة، وبعض عناصر التخزين المرتبطة بالأمان.",
          "أمثلة فئة التفضيلات: اختيار اللغة والمظهر عبر ملفات ارتباط أو تخزين محلي.",
          "أمثلة التحليلات الاختيارية: معرفات PostHog أو إعدادات تسجيل الجلسات فقط بعد موافقتك وفقط إذا كانت هذه الميزات مفعلة.",
          "أمثلة الفوترة المستضافة: قد يستخدم شريك الدفع المعتمد أو التاجر الرسمي الموضح عند الدفع ملفات الارتباط الخاصة به في صفحات الدفع أو الفواتير أو بوابة الفوترة التي يستضيفها.",
        ],
      },
    },
    {
      title: { en: "4. Consent controls and changing preferences", ar: "4. ضوابط الموافقة وتغيير التفضيلات" },
      body: {
        en: "If the GDPR banner appears for your region, you can accept or reject non-essential storage from the banner. You can also change those choices later in Settings if you have an account.",
        ar: "إذا ظهر شريط موافقة GDPR في منطقتك، فيمكنك قبول التخزين غير الضروري أو رفضه من خلال الشريط. كما يمكنك تغيير هذه الخيارات لاحقًا من الإعدادات إذا كان لديك حساب.",
      },
      items: {
        en: [
          "Necessary storage stays on because the app cannot work properly without it.",
          "Rejecting non-essential storage does not block core use of the product.",
          "You can also clear cookies or local storage from your browser settings.",
        ],
        ar: [
          "يبقى التخزين الضروري مفعلاً لأن التطبيق لا يعمل بشكل صحيح بدونه.",
          "رفض التخزين غير الضروري لا يمنع الاستخدام الأساسي للمنتج.",
          "كما يمكنك مسح ملفات الارتباط أو التخزين المحلي من إعدادات المتصفح.",
        ],
      },
      links: [
        {
          href: "/privacy",
          label: {
            en: "Read the Privacy Policy",
            ar: "اقرأ سياسة الخصوصية",
          },
        },
      ],
    },
    {
      title: { en: "5. Third parties", ar: "5. الجهات الخارجية" },
      body: {
        en: "Some third-party providers connected to Fazumi may use their own cookies or browser storage when their services are active.",
        ar: "قد يستخدم بعض مزودي الخدمة الخارجيين المرتبطين بفازومي ملفات ارتباط خاصة بهم أو وسائل تخزين في المتصفح عندما تكون خدماتهم نشطة.",
      },
      items: {
        en: [
          "Supabase may set authentication or session cookies to keep you signed in.",
          "The authorised payment partner or Merchant of Record shown at checkout may set its own cookies on hosted checkout, invoice, or billing-portal pages.",
          "PostHog may set browser storage for analytics or session replay only after your opt-in and only when those features are enabled.",
        ],
        ar: [
          "قد تضع Supabase ملفات مصادقة أو جلسة لإبقائك مسجلاً للدخول.",
          "وقد يضع شريك الدفع المعتمد أو التاجر الرسمي الموضح عند الدفع ملفات الارتباط الخاصة به في صفحات الدفع أو الفواتير أو بوابة الفوترة المستضافة لديه.",
          "وقد تنشئ PostHog تخزينًا في المتصفح للتحليلات أو تسجيل الجلسات فقط بعد موافقتك وفقط عندما تكون هذه الميزات مفعلة.",
        ],
      },
    },
    {
      title: { en: "6. Contact", ar: "6. التواصل" },
      body: {
        en: "If you have questions about cookies, browser storage, or consent choices, contact us at:",
        ar: "إذا كانت لديك أسئلة حول ملفات الارتباط أو تخزين المتصفح أو خيارات الموافقة، فتواصل معنا على:",
      },
      emails: [LEGAL_CONTACT_EMAIL],
    },
  ] satisfies readonly CookieSection[],
} as const;

export default function CookiePolicyPage() {
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

        <div className="grid gap-4 md:grid-cols-2">
          {COPY.categories.map(({ title, body, icon: Icon }) => (
            <Card key={title.en}>
              <CardHeader className={cn(isArabic && "text-right")}>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle>{pick(title, locale)}</CardTitle>
              </CardHeader>
              <CardContent className={cn(isArabic && "text-right")}>
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  {pick(body, locale)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

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
