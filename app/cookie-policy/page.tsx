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

const LAST_UPDATED = "2026-03-06";

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

interface CookieRow {
  name: string;
  type: LocalizedCopy<string>;
  purpose: LocalizedCopy<string>;
  duration: LocalizedCopy<string>;
  category: LocalizedCopy<string>;
}

const COPY = {
  eyebrow: { en: "Legal", ar: "قانوني" },
  title: { en: "Cookie Policy", ar: "سياسة ملفات الارتباط" },
  description: {
    en: "How Fazumi uses cookies and browser storage for sign-in, preferences, and optional analytics.",
    ar: "كيف يستخدم Fazumi ملفات الارتباط وتخزين المتصفح لتسجيل الدخول والتفضيلات والتحليلات الاختيارية.",
  },
  lastUpdated: {
    en: `Last updated: ${LAST_UPDATED}`,
    ar: `آخر تحديث: ${LAST_UPDATED}`,
  },
  sections: [
    {
      title: { en: "1. What cookies are", ar: "1. ما هي ملفات الارتباط" },
      body: {
        en: "Cookies are small files placed in your browser. Fazumi also uses similar browser storage, such as localStorage, to remember your language, theme, consent choices, and optional analytics settings.",
        ar: "ملفات الارتباط هي ملفات صغيرة تُحفظ في متصفحك. كما يستخدم Fazumi وسائل تخزين مشابهة في المتصفح مثل localStorage لتذكر اللغة والمظهر وخيارات الموافقة وإعدادات التحليلات الاختيارية.",
      },
    },
    {
      title: { en: "2. Categories we use today", ar: "2. الفئات التي نستخدمها حاليًا" },
      body: {
        en: "Fazumi mainly uses necessary storage for sign-in, consent handling, language, and saved preferences. Optional analytics storage is used only if you opt in and analytics is enabled in the app configuration. Fazumi does not currently run first-party marketing cookies on the main app.",
        ar: "يعتمد Fazumi أساسًا على التخزين الضروري لتسجيل الدخول وإدارة الموافقة واللغة والتفضيلات المحفوظة. ويتم استخدام التخزين الخاص بالتحليلات فقط إذا وافقت عليه وكانت التحليلات مفعلة في إعدادات التطبيق. ولا يشغل Fazumi حاليًا ملفات تسويق من الطرف الأول على التطبيق الرئيسي.",
      },
      items: {
        en: [
          "Strictly necessary storage keeps sign-in, session continuity, security, and your privacy choices working.",
          "Preference storage remembers language and theme selections.",
          "Analytics and session replay stay off until you opt in where consent is required.",
          "Marketing storage is currently not used by Fazumi on the main app.",
        ],
        ar: [
          "يحافظ التخزين الضروري للغاية على تسجيل الدخول واستمرار الجلسة والأمان وخيارات الخصوصية الخاصة بك.",
          "يتذكر تخزين التفضيلات اختيارات اللغة والمظهر.",
          "تبقى التحليلات وتسجيل الجلسات متوقفة حتى توافق عليها عندما تكون الموافقة مطلوبة.",
          "لا يستخدم Fazumi حاليًا تخزين التسويق على التطبيق الرئيسي.",
        ],
      },
    },
    {
      title: { en: "3. Consent management and your choices", ar: "3. إدارة الموافقة وخياراتك" },
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
      title: { en: "4. Third parties", ar: "4. الجهات الخارجية" },
      body: {
        en: "Some third-party providers connected to Fazumi may use their own cookies or browser storage when their services are active.",
        ar: "قد يستخدم بعض مزودي الخدمة الخارجيين المرتبطين بـ Fazumi ملفات ارتباط خاصة بهم أو وسائل تخزين في المتصفح عندما تكون خدماتهم نشطة.",
      },
      items: {
        en: [
          "Supabase may set authentication cookies that keep you signed in.",
          "Lemon Squeezy may set its own cookies on hosted checkout, invoice, or billing-portal pages.",
          "PostHog may set browser storage keys if you opt in to analytics or session replay and those features are enabled.",
        ],
        ar: [
          "قد تضع Supabase ملفات مصادقة تبقيك مسجلاً للدخول.",
          "وقد تضع Lemon Squeezy ملفاتها الخاصة في صفحات الدفع أو الفواتير أو بوابة الفوترة المستضافة لديها.",
          "وقد تنشئ PostHog مفاتيح تخزين في المتصفح إذا وافقت على التحليلات أو تسجيل الجلسات وكانت هذه الميزات مفعلة.",
        ],
      },
    },
    {
      title: { en: "5. Contact", ar: "5. التواصل" },
      body: {
        en: "If you have questions about cookies, browser storage, or consent choices, contact us at:",
        ar: "إذا كانت لديك أسئلة حول ملفات الارتباط أو تخزين المتصفح أو خيارات الموافقة، فتواصل معنا على:",
      },
      emails: [LEGAL_CONTACT_EMAIL],
    },
  ] satisfies readonly CookieSection[],
  categories: [
    {
      title: { en: "Strictly necessary", ar: "ضرورية للغاية" },
      body: {
        en: "Needed for sign-in, session security, consent handling, and core product functionality. These do not require consent.",
        ar: "مطلوبة لتسجيل الدخول وأمان الجلسة وإدارة الموافقة والوظائف الأساسية للمنتج. ولا تتطلب موافقة.",
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
        ar: "لا يستخدم Fazumi حاليًا ملفات تسويق من الطرف الأول على التطبيق الرئيسي. وإذا تغير ذلك، فسنطلب الموافقة أولًا عندما تكون مطلوبة.",
      },
      icon: Megaphone,
    },
  ],
  tableTitle: {
    en: "Common cookies and browser storage we use",
    ar: "ملفات الارتباط ووسائل تخزين المتصفح الشائعة التي نستخدمها",
  },
  tableDescription: {
    en: "This list reflects the current app implementation and may vary slightly by environment or provider version.",
    ar: "تعكس هذه القائمة التنفيذ الحالي للتطبيق وقد تختلف بشكل طفيف بحسب البيئة أو إصدار مزود الخدمة.",
  },
  tableHeaders: {
    name: { en: "Name", ar: "الاسم" },
    type: { en: "Type", ar: "النوع" },
    purpose: { en: "Purpose", ar: "الغرض" },
    duration: { en: "Duration", ar: "المدة" },
    category: { en: "Category", ar: "الفئة" },
  },
  rows: [
    {
      name: "sb-<project-ref>-auth-token / supabase-auth-token",
      type: { en: "Cookie", ar: "ملف ارتباط" },
      purpose: {
        en: "Keeps you signed in to Fazumi through Supabase authentication.",
        ar: "يبقيك مسجلاً للدخول إلى Fazumi عبر مصادقة Supabase.",
      },
      duration: {
        en: "Session or rolling auth lifetime",
        ar: "مدة الجلسة أو مدة مصادقة متجددة",
      },
      category: { en: "Strictly necessary", ar: "ضرورية للغاية" },
    },
    {
      name: "fazumi_region",
      type: { en: "Cookie", ar: "ملف ارتباط" },
      purpose: {
        en: "Stores a country code so the app can decide whether to show regulated-region consent prompts.",
        ar: "يحفظ رمز الدولة حتى يتمكن التطبيق من تحديد ما إذا كان يجب إظهار رسائل الموافقة الخاصة بالمناطق المنظمة.",
      },
      duration: { en: "30 days", ar: "30 يومًا" },
      category: { en: "Strictly necessary", ar: "ضرورية للغاية" },
    },
    {
      name: "fazumi_lang",
      type: { en: "Cookie", ar: "ملف ارتباط" },
      purpose: {
        en: "Remembers your English or Arabic interface preference before the app fully loads.",
        ar: "يتذكر تفضيلك للواجهة الإنجليزية أو العربية قبل اكتمال تحميل التطبيق.",
      },
      duration: { en: "1 year", ar: "سنة واحدة" },
      category: { en: "Preferences", ar: "التفضيلات" },
    },
    {
      name: "fazumi_gdpr_consent",
      type: { en: "Local storage", ar: "تخزين محلي" },
      purpose: {
        en: "Stores your consent decision, version, timestamp, and allowed optional features.",
        ar: "يحفظ قرار الموافقة والإصدار والطابع الزمني والميزات الاختيارية المسموح بها.",
      },
      duration: { en: "Up to 1 year unless cleared", ar: "حتى سنة واحدة ما لم يتم مسحه" },
      category: { en: "Strictly necessary", ar: "ضرورية للغاية" },
    },
    {
      name: "fazumi_theme",
      type: { en: "Local storage", ar: "تخزين محلي" },
      purpose: {
        en: "Remembers your light or dark appearance preference.",
        ar: "يتذكر تفضيلك للمظهر الفاتح أو الداكن.",
      },
      duration: { en: "Until cleared", ar: "حتى يتم مسحه" },
      category: { en: "Preferences", ar: "التفضيلات" },
    },
    {
      name: "ph_*_posthog",
      type: { en: "Local storage", ar: "تخزين محلي" },
      purpose: {
        en: "May store analytics or session replay identifiers if you opt in and PostHog is enabled.",
        ar: "قد يحفظ معرفات التحليلات أو تسجيل الجلسات إذا وافقت على ذلك وكانت PostHog مفعلة.",
      },
      duration: { en: "Varies by provider settings", ar: "تختلف بحسب إعدادات المزود" },
      category: { en: "Analytics", ar: "التحليلات" },
    },
  ] satisfies readonly CookieRow[],
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

        <Card>
          <CardHeader className={cn(isArabic && "text-right")}>
            <CardTitle>{pick(COPY.tableTitle, locale)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className={cn("text-sm leading-7 text-[var(--muted-foreground)]", isArabic && "text-right")}>
              {pick(COPY.tableDescription, locale)}
            </p>
            <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)]">
              <table className="min-w-full divide-y divide-[var(--border)] text-sm">
                <thead className="bg-[var(--surface-muted)]">
                  <tr>
                    <th className={cn("px-4 py-3 text-left font-semibold text-[var(--foreground)]", isArabic && "text-right")}>
                      {pick(COPY.tableHeaders.name, locale)}
                    </th>
                    <th className={cn("px-4 py-3 text-left font-semibold text-[var(--foreground)]", isArabic && "text-right")}>
                      {pick(COPY.tableHeaders.type, locale)}
                    </th>
                    <th className={cn("px-4 py-3 text-left font-semibold text-[var(--foreground)]", isArabic && "text-right")}>
                      {pick(COPY.tableHeaders.purpose, locale)}
                    </th>
                    <th className={cn("px-4 py-3 text-left font-semibold text-[var(--foreground)]", isArabic && "text-right")}>
                      {pick(COPY.tableHeaders.duration, locale)}
                    </th>
                    <th className={cn("px-4 py-3 text-left font-semibold text-[var(--foreground)]", isArabic && "text-right")}>
                      {pick(COPY.tableHeaders.category, locale)}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--surface-elevated)]">
                  {COPY.rows.map((row) => (
                    <tr key={row.name}>
                      <td className="px-4 py-3 align-top font-medium text-[var(--foreground)]">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 align-top text-[var(--muted-foreground)]">
                        {pick(row.type, locale)}
                      </td>
                      <td className="px-4 py-3 align-top text-[var(--muted-foreground)]">
                        {pick(row.purpose, locale)}
                      </td>
                      <td className="px-4 py-3 align-top text-[var(--muted-foreground)]">
                        {pick(row.duration, locale)}
                      </td>
                      <td className="px-4 py-3 align-top text-[var(--muted-foreground)]">
                        {pick(row.category, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

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
