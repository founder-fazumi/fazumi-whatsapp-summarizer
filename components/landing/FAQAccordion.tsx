"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AccordionItem } from "@/components/ui/accordion";
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
      en: "Yes. Fazumi does not store your raw chat messages in the summaries database. It stores the generated summary, saved group name, and any memory settings you choose. ZIP imports also keep message fingerprints for repeat-import matching.",
      ar: "نعم. لا يحفظ فازومي رسائل المحادثة الخام في قاعدة بيانات الملخصات. بل يحفظ الملخص الناتج واسم المجموعة المحفوظ وأي إعدادات ذاكرة تختارها. كما يحتفظ استيراد ZIP ببصمات الرسائل لمطابقة الاستيراد المتكرر.",
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
      en: "Yes. Fazumi includes spouse or caregiver sharing, a shared calendar export, and a clean family action list so everyone can stay aligned without full multi-user setup.",
      ar: "نعم. يتضمن فازومي مشاركة مع الزوج أو الزوجة أو مقدم الرعاية، وتصديرًا لتقويم مشترك، وقائمة إجراءات عائلية واضحة حتى يبقى الجميع على اطلاع من دون إعداد تعاون كامل بين عدة مستخدمين.",
    },
  },
  {
    question: {
      en: "Does it work with Arabic chats?",
      ar: "هل يعمل مع المحادثات العربية؟",
    },
    answer: {
      en: "Yes. Fazumi supports Arabic and English chats, including mixed-language school groups. You can choose Auto, English, or Arabic output before summarizing.",
      ar: "نعم. يدعم فازومي المحادثات العربية والإنجليزية بما فيها مجموعات المدرسة المختلطة. يمكنك اختيار الإخراج التلقائي أو الإنجليزية أو العربية قبل التلخيص.",
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
      en: "Open the billing page after signing in and use the Lemon Squeezy customer portal to cancel. Your paid access stays active until the current billing period ends.",
      ar: "افتح صفحة الفوترة بعد تسجيل الدخول واستخدم بوابة Lemon Squeezy الخاصة بالعميل لإلغاء الاشتراك. يبقى وصولك المدفوع نشطًا حتى نهاية فترة الفوترة الحالية.",
    },
  },
] as const;

const COPY = {
  eyebrow: { en: "FAQ", ar: "الأسئلة الشائعة" },
  title: { en: "Answers before you commit", ar: "إجابات قبل أن تشترك" },
  subtitle: {
    en: "The questions GCC parents ask most often before starting a trial.",
    ar: "الأسئلة التي يطرحها أولياء الأمور في الخليج غالبًا قبل بدء التجربة.",
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

        <div className={cn("surface-panel bg-[var(--surface-elevated)] px-5 sm:px-6", showHeading && "mt-8")}>
          {FAQS.map((item, index) => (
            <AccordionItem
              key={`${item.question.en}-${index}`}
              question={pick(item.question, locale)}
              answer={pick(item.answer, locale)}
              defaultOpen={index === 0}
              buttonClassName="min-h-12 py-5"
              questionClassName="text-[var(--text-base)] font-semibold text-[var(--foreground)]"
              contentClassName="pb-5"
              answerClassName="mt-3 text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]"
            />
          ))}
        </div>

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
