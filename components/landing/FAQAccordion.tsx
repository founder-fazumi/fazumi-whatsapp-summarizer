"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FaqAccordion } from "@/components/ui/accordion";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    question: {
      en: "How does Fazumi work?",
      ar: "كيف يعمل فازومي؟",
    },
    answer: {
      en: "Paste school chat text from WhatsApp, Telegram, or Facebook, or upload the export. Fazumi turns it into one action-ready family dashboard with dates, tasks, fees, forms, supplies, and follow-up questions.",
      ar: "الصق نص محادثة المدرسة من واتساب أو تيليجرام أو فيسبوك، أو ارفع ملف التصدير. يحوله فازومي إلى لوحة عائلية واحدة جاهزة للتنفيذ تضم التواريخ والمهام والرسوم والنماذج والمستلزمات وأسئلة المتابعة.",
    },
  },
  {
    question: {
      en: "Is my chat data private?",
      ar: "هل بيانات المحادثة خاصة؟",
    },
    answer: {
      en: "Your raw chat text is never stored. Only the structured summary — dates, action items, links — is saved to your history. The original messages are processed in memory and discarded.",
      ar: "نص محادثتك الأصلي لا يُخزَّن أبدًا. يتم حفظ الملخص المنظَّم فقط — المواعيد وبنود الإجراءات والروابط. تتم معالجة الرسائل الأصلية في الذاكرة وتجاهلها.",
    },
  },
  {
    question: {
      en: "How many free summaries do I get?",
      ar: "كم عدد الملخصات المجانية التي أحصل عليها؟",
    },
    answer: {
      en: "Every new account starts with a 7-day free trial that includes 3 summaries per day. After the trial ends, you keep 3 lifetime free summaries unless you upgrade.",
      ar: "يبدأ كل حساب جديد بتجربة مجانية لمدة 7 أيام تشمل 3 ملخصات يوميًا. بعد انتهاء التجربة تحتفظ بثلاثة ملخصات مجانية مدى الحياة ما لم تقم بالترقية.",
    },
  },
  {
    question: {
      en: "Can I share summaries with my spouse?",
      ar: "هل يمكنني مشاركة الملخصات مع زوجي أو زوجتي؟",
    },
    answer: {
      en: "Yes. You can export a summary as a plain-text file and share it via WhatsApp, Telegram, or any messaging app. Family sharing features are on the roadmap.",
      ar: "نعم. يمكنك تصدير الملخص كملف نصي ومشاركته عبر واتساب أو تيليجرام أو أي تطبيق مراسلة. ميزات المشاركة العائلية قادمة قريبًا.",
    },
  },
  {
    question: {
      en: "Does it work with Arabic chats?",
      ar: "هل يعمل مع المحادثات العربية؟",
    },
    answer: {
      en: "Yes. Fazumi auto-detects Arabic input and returns summaries in Arabic. You can also force Arabic output for any language input using the language selector.",
      ar: "نعم. يكتشف Fazumi العربية تلقائيًا ويُنتج الملخصات بالعربية. يمكنك أيضًا إجبار الإخراج بالعربية لأي لغة مدخلة باستخدام محدد اللغة.",
    },
  },
  {
    question: {
      en: "What if I exceed my limit?",
      ar: "ماذا يحدث إذا تجاوزت الحد؟",
    },
    answer: {
      en: "Your saved summaries stay available. To create more summaries, wait for the next daily reset if you are in trial, or upgrade to Pro for higher daily limits.",
      ar: "تبقى ملخصاتك المحفوظة متاحة. ولإنشاء المزيد من الملخصات يمكنك انتظار إعادة الضبط اليومية التالية إذا كنت في الفترة التجريبية أو الترقية إلى Pro لحدود أعلى يوميًا.",
    },
  },
  {
    question: {
      en: "How do I cancel my subscription?",
      ar: "كيف ألغي الاشتراك؟",
    },
    answer: {
      en: "Open the billing page after signing in and use the billing portal linked there to manage or cancel your subscription. Cancellation stops future renewals, and paid access follows the latest subscription status in your account.",
      ar: "افتح صفحة الفوترة بعد تسجيل الدخول واستخدم بوابة الفوترة المرتبطة هناك لإدارة الاشتراك أو إلغائه. ويؤدي الإلغاء إلى إيقاف التجديدات المستقبلية، بينما يتبع الوصول المدفوع أحدث حالة اشتراك ظاهرة في حسابك.",
    },
  },
  {
    question: {
      en: "What is the refund policy for paid plans?",
      ar: "ما سياسة الاسترداد للخطط المدفوعة؟",
    },
    answer: {
      en: "You can request a refund within 14 days of the initial purchase date for a paid Fazumi plan. The authorised payment partner or Merchant of Record shown at checkout handles the final billing workflow.",
      ar: "يمكنك طلب استرداد المبلغ خلال 14 يومًا من تاريخ الشراء الأول لأي خطة مدفوعة في فازومي. ويتولى شريك الدفع المعتمد أو التاجر الرسمي الموضح عند الدفع الخطوات النهائية للفوترة.",
    },
  },
] as const;

const COPY = {
  eyebrow: { en: "FAQ", ar: "الأسئلة الشائعة" },
  title: { en: "Answers before you commit", ar: "إجابات قبل أن تشترك" },
  subtitle: {
    en: "The questions parents ask most often before starting a trial.",
    ar: "الأسئلة التي يطرحها أولياء الأمور غالبًا قبل بدء التجربة.",
  },
  more: { en: "View the full FAQ page", ar: "عرض صفحة الأسئلة الشائعة كاملة" },
} satisfies Record<string, LocalizedCopy<string>>;

interface FAQAccordionProps {
  showHeading?: boolean;
  showMoreLink?: boolean;
  className?: string;
}

export function FAQAccordion({
  showHeading = true,
  showMoreLink = true,
  className,
}: FAQAccordionProps) {
  const { locale } = useLang();

  return (
    <section
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
      className={cn(locale === "ar" && "font-arabic", className)}
    >
      <div className="mx-auto max-w-4xl">
        {showHeading ? (
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
              {pick(COPY.eyebrow, locale)}
            </p>
            <h2 className="mt-3 text-[var(--text-2xl)] font-bold text-[var(--foreground)] sm:text-[var(--text-3xl)]">
              {pick(COPY.title, locale)}
            </h2>
            <p className="mt-3 text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
              {pick(COPY.subtitle, locale)}
            </p>
          </div>
        ) : null}

        <FaqAccordion
          items={FAQS.map((item) => ({
            question: pick(item.question, locale),
            answer: pick(item.answer, locale),
          }))}
          defaultOpenFirst
          className={cn("surface-panel bg-[var(--surface-elevated)] px-5 sm:px-6", showHeading && "mt-8")}
          buttonClassName="min-h-12 py-5"
          questionClassName="text-[var(--text-base)] font-semibold text-[var(--foreground)]"
          contentClassName="pb-5"
          answerClassName="mt-3 text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]"
        />

        {showMoreLink ? (
          <div className="mt-6 flex justify-center">
            <Link
              href="/faq"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-5 py-2.5 text-[var(--text-sm)] font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              {pick(COPY.more, locale)}
              <ArrowRight className={cn("h-4 w-4", locale === "ar" && "rotate-180")} />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

