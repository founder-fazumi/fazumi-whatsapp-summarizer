"use client";

import { Cookie, ShieldCheck } from "lucide-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { pick } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LAST_UPDATED = "2026-03-01";

const COPY = {
  eyebrow: { en: "Policy", ar: "سياسة" },
  title: { en: "Cookie Policy", ar: "سياسة ملفات الارتباط" },
  description: {
    en: "How Fazumi uses cookies and similar browser storage.",
    ar: "كيف يستخدم Fazumi ملفات الارتباط والتخزين المشابه داخل المتصفح.",
  },
  lastUpdated: {
    en: `Last updated: ${LAST_UPDATED}`,
    ar: `آخر تحديث: ${LAST_UPDATED}`,
  },
  sections: [
    {
      title: { en: "1. What cookies are", ar: "1. ما هي ملفات الارتباط" },
      body: {
        en: "Cookies are small pieces of data stored in your browser. Similar technologies, such as local storage, can remember sessions or preferences so the site works as expected.",
        ar: "ملفات الارتباط هي أجزاء صغيرة من البيانات تُخزَّن في متصفحك. كما يمكن لتقنيات مشابهة مثل التخزين المحلي أن تتذكر الجلسات أو التفضيلات حتى يعمل الموقع كما هو متوقع.",
      },
      items: { en: [], ar: [] },
    },
    {
      title: { en: "2. How Fazumi uses browser storage today", ar: "2. كيف يستخدم Fazumi التخزين حاليًا" },
      body: {
        en: "At launch, Fazumi mainly relies on strictly necessary cookies and similar browser storage for sign-in, session continuity, language, and theme preferences.",
        ar: "عند الإطلاق يعتمد Fazumi أساسًا على ملفات ارتباط ضرورية وتخزين مشابه داخل المتصفح لتسجيل الدخول واستمرار الجلسة وتفضيلات اللغة والمظهر.",
      },
      items: { en: [], ar: [] },
    },
    {
      title: { en: "3. Consent for non-essential cookies", ar: "3. الموافقة على الملفات غير الضرورية" },
      body: {
        en: "When enabled, we do not set non-essential cookies until you choose. Analytics and marketing cookies are not strictly necessary for the service.",
        ar: "عند تفعيلها، لا نضبط ملفات الارتباط غير الضرورية إلا بعد اختيارك. فملفات التحليلات والتسويق ليست ضرورية لتشغيل الخدمة.",
      },
      items: { en: [], ar: [] },
    },
    {
      title: { en: "4. Managing cookies in your browser", ar: "4. إدارة الملفات من المتصفح" },
      body: {
        en: "Most browsers let you clear, block, or limit cookies from their settings. You can also remove local storage data for this site.",
        ar: "تتيح لك معظم المتصفحات مسح ملفات الارتباط أو حظرها أو تقييدها من خلال الإعدادات، كما يمكنك حذف بيانات التخزين المحلي الخاصة بهذا الموقع.",
      },
      items: {
        en: [
          "Clearing cookies may sign you out.",
          "Removing site storage may reset your saved language or theme preferences.",
        ],
        ar: [
          "وقد يؤدي مسح ملفات الارتباط إلى تسجيل خروجك.",
          "كما أن حذف بيانات الموقع قد يعيد ضبط تفضيلات اللغة أو المظهر المحفوظة لديك.",
        ],
      },
    },
    {
      title: { en: "5. Third parties", ar: "5. الجهات الخارجية" },
      body: {
        en: "Some third-party services connected to Fazumi may use their own cookies or similar identifiers when their features are active, such as authentication or checkout providers.",
        ar: "قد تستخدم بعض الخدمات الخارجية المرتبطة بـ Fazumi ملفات ارتباط خاصة بها أو معرفات مشابهة عندما تكون ميزاتها فعّالة، مثل مزودي المصادقة أو الدفع.",
      },
      items: {
        en: [
          "Supabase may be involved for authentication and session handling.",
          "Lemon Squeezy may use its own cookies on hosted checkout or billing pages.",
          "If analytics or marketing tools are enabled later, they will fall under the consent rules above.",
        ],
        ar: [
          "قد يشارك Supabase في المصادقة وإدارة الجلسات.",
          "وقد تستخدم Lemon Squeezy ملفاتها الخاصة في صفحات الدفع أو الفوترة المستضافة لديها.",
          "وإذا تم تفعيل أدوات التحليلات أو التسويق لاحقًا فستسري عليها قواعد الموافقة المذكورة أعلاه.",
        ],
      },
    },
  ],
  categories: [
    {
      title: { en: "Strictly necessary", ar: "ضرورية للغاية" },
      body: {
        en: "Needed for sign-in, session security, and core product functionality. These do not require consent.",
        ar: "مطلوبة لتسجيل الدخول وأمان الجلسة والوظائف الأساسية للمنتج. ولا تتطلب موافقة.",
      },
      icon: ShieldCheck,
    },
    {
      title: { en: "Preferences", ar: "التفضيلات" },
      body: {
        en: "Used to remember choices such as language or theme. These may use cookies or local storage depending on the feature.",
        ar: "تُستخدم لتذكر اختياراتك مثل اللغة أو المظهر. وقد تعتمد على ملفات ارتباط أو تخزين محلي بحسب الميزة.",
      },
      icon: Cookie,
    },
    {
      title: { en: "Analytics", ar: "التحليلات" },
      body: {
        en: "When enabled, analytics help us understand performance and usage trends. These require consent.",
        ar: "عند تفعيلها، تساعدنا التحليلات على فهم الأداء واتجاهات الاستخدام. وهذه الفئة تتطلب موافقة.",
      },
      icon: Cookie,
    },
    {
      title: { en: "Marketing", ar: "التسويق" },
      body: {
        en: "When enabled, marketing cookies may support campaign measurement or promotional messaging. These require consent.",
        ar: "عند تفعيلها، قد تدعم ملفات التسويق قياس الحملات أو الرسائل الترويجية. وهذه الفئة تتطلب موافقة.",
      },
      icon: Cookie,
    },
  ],
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PublicPageShell>
  );
}
