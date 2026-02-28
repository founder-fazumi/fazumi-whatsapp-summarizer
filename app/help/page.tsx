"use client";

import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion } from "@/components/ui/accordion";
import { HelpCircle, Mail } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { pick } from "@/lib/i18n";

const FAQS = [
  {
    q: {
      en: "How does Fazumi work?",
      ar: "كيف يعمل Fazumi؟",
    },
    a: {
      en: "Paste your WhatsApp group chat export into the text box, click Summarize, and Fazumi extracts key dates, tasks, people, and questions in seconds.",
      ar: "الصق تصدير محادثة واتساب في مربع النص ثم اضغط على التلخيص، وسيستخرج Fazumi التواريخ والمهام والأشخاص والأسئلة خلال ثوانٍ.",
    },
  },
  {
    q: {
      en: "Is my chat text stored?",
      ar: "هل يتم حفظ نص المحادثة؟",
    },
    a: {
      en: "No. Your raw chat text is processed in memory and discarded immediately. Only the structured summary output is saved.",
      ar: "لا. تتم معالجة نص المحادثة الخام في الذاكرة ثم يُحذف فورًا. يتم حفظ المخرجات المنظمة فقط.",
    },
  },
  {
    q: {
      en: "What languages are supported?",
      ar: "ما اللغات المدعومة؟",
    },
    a: {
      en: "Fazumi auto-detects Arabic and English and can also be pinned to a preferred output language.",
      ar: "يكتشف Fazumi العربية والإنجليزية تلقائيًا ويمكن أيضًا تثبيته على لغة إخراج مفضلة.",
    },
  },
  {
    q: {
      en: "How many summaries do I get on the free plan?",
      ar: "كم عدد الملخصات المتاحة في الخطة المجانية؟",
    },
    a: {
      en: "You get a 7-day free trial with unlimited summaries, then 3 lifetime summaries without a subscription.",
      ar: "تحصل على تجربة مجانية لمدة 7 أيام مع ملخصات غير محدودة، ثم 3 ملخصات مدى الحياة بدون اشتراك.",
    },
  },
  {
    q: {
      en: "Can I summarize a ZIP file?",
      ar: "هل يمكنني تلخيص ملف ZIP؟",
    },
    a: {
      en: "Yes. Upload a WhatsApp export zip file and Fazumi extracts the text automatically while ignoring media files.",
      ar: "نعم. ارفع ملف zip لتصدير واتساب وسيستخرج Fazumi النص تلقائيًا مع تجاهل ملفات الوسائط.",
    },
  },
  {
    q: {
      en: "How do I cancel my subscription?",
      ar: "كيف ألغي اشتراكي؟",
    },
    a: {
      en: "You can cancel anytime from the Billing page and keep access until the end of the billing period.",
      ar: "يمكنك الإلغاء في أي وقت من صفحة الفوترة مع الاحتفاظ بالوصول حتى نهاية فترة الفوترة.",
    },
  },
];

export default function HelpPage() {
  const { locale } = useLang();
  const isArabic = locale === "ar";

  return (
    <PublicPageShell
      eyebrow={{ en: "Support", ar: "الدعم" }}
      title={{ en: "Help & Support", ar: "المساعدة والدعم" }}
      description={{
        en: "Answers to the common setup, plan, and product questions, plus a direct support contact if you still need help.",
        ar: "إجابات عن الأسئلة الشائعة المتعلقة بالإعداد والخطط والمنتج، مع وسيلة تواصل مباشرة مع الدعم إذا كنت لا تزال بحاجة إلى مساعدة.",
      }}
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <Card>
          <CardHeader className={isArabic ? "text-right" : undefined}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <HelpCircle className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <CardTitle>{locale === "ar" ? "المساعدة والأسئلة" : "Help & FAQ"}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion
              items={FAQS.map((faq) => ({
                question: pick(faq.q, locale),
                answer: pick(faq.a, locale),
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`py-5 ${isArabic ? "text-right" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <Mail className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {locale === "ar" ? "هل ما زلت بحاجة إلى مساعدة؟" : "Still need help?"}
                </p>
                <a
                  href="mailto:support@fazumi.app"
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  support@fazumi.app
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  );
}
