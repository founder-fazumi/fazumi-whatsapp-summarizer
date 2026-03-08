"use client";

import Link from "next/link";
import { Mail, MessageSquareMore } from "lucide-react";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEGAL_CONTACT_EMAIL } from "@/lib/config/legal";
import { useLang } from "@/lib/context/LangContext";
import { pick } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";

const faqPageSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does Fazumi work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Paste your school WhatsApp chat or upload the export. Fazumi reads the conversation, extracts dates, tasks, announcements, links, and follow-up questions, then saves the clean summary to your history.",
      },
    },
    {
      "@type": "Question",
      name: "Is my chat data private?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Fazumi does not store your raw chat messages in the database. Only the generated summary and structured items are saved to your account history.",
      },
    },
    {
      "@type": "Question",
      name: "How many free summaries do I get?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Every new account starts with a 7-day free trial that includes 3 summaries per day. After the trial ends, you keep 3 lifetime free summaries unless you upgrade.",
      },
    },
    {
      "@type": "Question",
      name: "Can I share summaries with my spouse?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You can export a summary as a plain-text file and share it via WhatsApp, Telegram, or any messaging app. Family sharing features are on the roadmap.",
      },
    },
    {
      "@type": "Question",
      name: "Does it work with Arabic chats?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Fazumi supports Arabic and English chats, including mixed-language school groups. You can choose Auto, English, or Arabic output before summarizing.",
      },
    },
    {
      "@type": "Question",
      name: "What if I exceed my limit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your saved summaries stay available. To create more summaries, wait for the next daily reset if you are in trial, or upgrade to Pro for higher daily limits.",
      },
    },
    {
      "@type": "Question",
      name: "How do I cancel my subscription?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Open the billing page after signing in and use the Lemon Squeezy customer portal to cancel. Paid access follows the latest subscription status, and billing recovery restores it once Lemon Squeezy marks the subscription active again.",
      },
    },
  ],
};

const faqBreadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: APP_URL },
    { "@type": "ListItem", position: 2, name: "FAQ", item: `${APP_URL}/faq` },
  ],
};

const COPY = {
  eyebrow: { en: "FAQ", ar: "الأسئلة الشائعة" },
  title: { en: "Frequently asked questions", ar: "الأسئلة الشائعة" },
  description: {
    en: "The most important questions about privacy, limits, billing, and bilingual school-chat summaries.",
    ar: "أهم الأسئلة حول الخصوصية والحدود والفوترة وملخصات محادثات المدرسة ثنائية اللغة.",
  },
  supportTitle: { en: "Still deciding?", ar: "هل ما زلت تتخذ القرار؟" },
  supportBody: {
    en: "If you want a direct answer before starting your trial, contact Fazumi support and we will point you to the right plan or workflow.",
    ar: "إذا كنت تريد إجابة مباشرة قبل بدء التجربة، فتواصل مع دعم فازومي وسنوجّهك إلى الخطة أو طريقة الاستخدام المناسبة.",
  },
  supportCta: { en: "Contact support", ar: "اتصل بالدعم" },
  emailLabel: { en: "Email support", ar: "راسل الدعم" },
} as const;

export default function FAQPage() {
  const { locale } = useLang();
  const isArabic = locale === "ar";

  return (
    <PublicPageShell
      eyebrow={COPY.eyebrow}
      title={COPY.title}
      description={COPY.description}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqBreadcrumbSchema) }}
      />
      <div
        dir={isArabic ? "rtl" : "ltr"}
        lang={locale}
        className={cn("space-y-4", isArabic && "font-arabic")}
      >
        <FAQAccordion showHeading={false} showMoreLink={false} />

        <Card>
          <CardHeader className={cn(isArabic && "text-right")}>
            <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse")}>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                <MessageSquareMore className="h-5 w-5" />
              </div>
              <CardTitle>{pick(COPY.supportTitle, locale)}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className={cn("space-y-4", isArabic && "text-right")}>
            <p className="text-sm leading-7 text-[var(--muted-foreground)]">
              {pick(COPY.supportBody, locale)}
            </p>
            <div className={cn("flex flex-wrap gap-3", isArabic && "justify-end")}>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center rounded-[var(--radius-lg)] bg-[var(--primary)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--primary-hover)]"
              >
                {pick(COPY.supportCta, locale)}
              </Link>
              <a
                href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] px-5 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                <Mail className="h-4 w-4" />
                {pick(COPY.emailLabel, locale)}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  );
}
