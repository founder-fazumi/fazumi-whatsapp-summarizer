"use client";

import { useState } from "react";
import { AccordionItem } from "@/components/ui/accordion";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "privacy",
    label: { en: "Privacy", ar: "الخصوصية" },
    items: [
      {
        question: { en: "Is my chat data private?", ar: "هل بيانات المحادثة خاصة؟" },
        answer: {
          en: "Yes. Fazumi never stores your raw chat messages. Only the structured summary is saved, and only when you are logged in.",
          ar: "نعم. لا يحفظ Fazumi رسائل المحادثة الخام أبدًا. يتم حفظ الملخص المنظم فقط، وفقط عند تسجيل الدخول.",
        },
      },
      {
        question: { en: "Is Fazumi affiliated with my child's school?", ar: "هل Fazumi تابع لمدرسة طفلي؟" },
        answer: {
          en: "No. Fazumi is an independent tool built for parents and is not affiliated with any school or education authority.",
          ar: "لا. Fazumi أداة مستقلة موجهة لأولياء الأمور وليست تابعة لأي مدرسة أو جهة تعليمية.",
        },
      },
      {
        question: { en: "Who can see my summaries?", ar: "من يمكنه رؤية ملخصاتي؟" },
        answer: {
          en: "Only you. Summaries are private to your account and are not sold or shared.",
          ar: "أنت فقط. الملخصات خاصة بحسابك ولا تتم مشاركتها أو بيعها.",
        },
      },
    ],
  },
  {
    id: "language",
    label: { en: "Languages", ar: "اللغات" },
    items: [
      {
        question: { en: "What languages are supported?", ar: "ما اللغات المدعومة؟" },
        answer: {
          en: "Fazumi supports English and Arabic. You can auto-detect the chat language or force English or Arabic output.",
          ar: "يدعم Fazumi العربية والإنجليزية. يمكنك الكشف التلقائي عن لغة المحادثة أو فرض الإخراج بالعربية أو الإنجليزية.",
        },
      },
      {
        question: { en: "Does it work with mixed English and Arabic chats?", ar: "هل يعمل مع المحادثات المختلطة بين العربية والإنجليزية؟" },
        answer: {
          en: "Yes. When output is set to Auto, Fazumi detects the dominant language and you can still override it manually.",
          ar: "نعم. عند ضبط الإخراج على تلقائي، يكتشف Fazumi اللغة الغالبة ويمكنك تغييرها يدويًا في أي وقت.",
        },
      },
    ],
  },
  {
    id: "upload",
    label: { en: "Uploads", ar: "الملفات" },
    items: [
      {
        question: { en: "How does file upload work?", ar: "كيف يعمل رفع الملفات؟" },
        answer: {
          en: "Upload a WhatsApp export as .txt or .zip and Fazumi extracts the text while ignoring the media files.",
          ar: "ارفع تصدير واتساب كملف .txt أو .zip وسيستخرج Fazumi النص مع تجاهل ملفات الوسائط.",
        },
      },
      {
        question: { en: "What file types are supported?", ar: "ما أنواع الملفات المدعومة؟" },
        answer: {
          en: "Plain text files and WhatsApp export zip files are supported up to 10 MB.",
          ar: "الملفات النصية العادية وملفات zip الخاصة بتصدير واتساب مدعومة حتى 10 MB.",
        },
      },
      {
        question: { en: "Is there a message limit?", ar: "هل يوجد حد للرسائل؟" },
        answer: {
          en: "The paste box supports up to 30,000 characters, which covers a focused recent chat well.",
          ar: "يدعم مربع اللصق حتى 30,000 حرف، وهو مناسب جدًا لمحادثة حديثة ومركزة.",
        },
      },
    ],
  },
  {
    id: "billing",
    label: { en: "Billing", ar: "الفوترة" },
    items: [
      {
        question: { en: "Can I get a refund?", ar: "هل يمكنني استرداد المبلغ؟" },
        answer: {
          en: "Monthly and annual plans include a 7-day money-back guarantee. The Founder plan is final sale.",
          ar: "تشمل الخطط الشهرية والسنوية ضمان استرداد 7 أيام. أما خطة المؤسس فهي بيع نهائي.",
        },
      },
      {
        question: { en: "What happens after the free trial?", ar: "ماذا يحدث بعد التجربة المجانية؟" },
        answer: {
          en: "After the 7-day trial, the account falls back to 3 lifetime free summaries until you upgrade.",
          ar: "بعد انتهاء التجربة لمدة 7 أيام، يعود الحساب إلى 3 ملخصات مجانية مدى الحياة حتى تقوم بالترقية.",
        },
      },
      {
        question: { en: "What is the Founder plan?", ar: "ما هي خطة المؤسس؟" },
        answer: {
          en: "The Founder plan is a one-time lifetime deal with limited seats and future feature access.",
          ar: "خطة المؤسس هي صفقة مدى الحياة بدفعة واحدة مع عدد مقاعد محدود ووصول إلى الميزات المستقبلية.",
        },
      },
    ],
  },
];

const COPY = {
  eyebrow: { en: "FAQ", ar: "الأسئلة الشائعة" },
  title: { en: "Frequently asked questions", ar: "الأسئلة الأكثر شيوعًا" },
  subtitle: { en: "Everything parents ask before signing up.", ar: "كل ما يسأل عنه أولياء الأمور قبل التسجيل." },
} satisfies Record<string, LocalizedCopy<string>>;

export function FAQ() {
  const { locale } = useLang();
  const [activeTab, setActiveTab] = useState("privacy");
  const current = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  return (
    <section id="faq" className="page-section bg-[var(--page-layer)]">
      <div className="page-shell">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
              {pick(COPY.eyebrow, locale)}
            </p>
            <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
              {pick(COPY.title, locale)}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {pick(COPY.subtitle, locale)}
            </p>
          </div>

          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium shadow-[var(--shadow-xs)] transition-colors",
                  activeTab === tab.id
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted-foreground)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
                )}
              >
                {pick(tab.label, locale)}
              </button>
            ))}
          </div>

          <div className="surface-panel px-5">
            {current.items.map((item) => (
              <AccordionItem
                key={item.question.en}
                question={pick(item.question, locale)}
                answer={pick(item.answer, locale)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
