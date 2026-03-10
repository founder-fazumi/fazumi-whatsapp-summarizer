"use client";

import { useEffect, useState } from "react";
import { ChevronRight, MessageCircle } from "lucide-react";
import type { SummaryResult } from "@/lib/ai/summarize";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const COPY = {
  title: { en: "Ask FAZUMI", ar: "اسأل Fazumi" },
  beta: { en: "BETA", ar: "تجريبي" },
  subtitle: {
    en: "Quick parent follow-ups from this summary only. Full back-and-forth answers are coming soon.",
    ar: "متابعات سريعة للوالدين من هذا الملخص فقط. المحادثة التفاعلية الكاملة قادمة قريبًا.",
  },
  noAnswer: {
    en: "This summary does not answer that clearly yet — check with the teacher or school.",
    ar: "هذا الملخص لا يجيب عن ذلك بوضوح بعد — تحقق مع المعلم أو المدرسة.",
  },
  dismiss: { en: "Hide", ar: "إخفاء" },
} satisfies Record<string, LocalizedCopy<string>>;

type FollowUpQuestion = {
  question: string;
  answer: string | null;
};

function getTopDate(summary: SummaryResult): string | null {
  const topDate = summary.important_dates[0] as
    | string
    | { label?: string | null; date?: string | null }
    | undefined;

  if (!topDate) {
    return null;
  }

  if (typeof topDate === "string") {
    return topDate;
  }

  return topDate.label ?? topDate.date ?? null;
}

function getTopLink(summary: SummaryResult): string | null {
  const topLink = summary.links[0] as
    | string
    | { href?: string | null; url?: string | null; label?: string | null }
    | undefined;

  if (!topLink) {
    return null;
  }

  if (typeof topLink === "string") {
    return topLink;
  }

  return topLink.url ?? topLink.href ?? topLink.label ?? null;
}

function joinAnswers(values: string[], maxItems = 2): string | null {
  const items = values
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, maxItems);

  if (items.length === 0) {
    return null;
  }

  return items.join(" • ");
}

function buildQuestions(summary: SummaryResult, locale: "en" | "ar"): FollowUpQuestion[] {
  const questions: FollowUpQuestion[] = [];
  const topAction = summary.urgent_action_items[0] ?? summary.action_items[0] ?? null;
  const preparationItems = joinAnswers(summary.action_items, 2);
  const topDate = getTopDate(summary);
  const teachers = joinAnswers(summary.people_classes, 3);
  const topLink = getTopLink(summary);
  const topQuestion = summary.questions[0] ?? null;
  const fallbackAnswer = topAction ?? topDate ?? summary.tldr;

  questions.push({
    question: locale === "ar" ? "ما أول شيء يجب أن أتعامل معه الآن؟" : "What should I handle first right now?",
    answer: fallbackAnswer,
  });
  questions.push({
    question: locale === "ar" ? "ماذا يجب أن أرسل أو أجهّز للمدرسة؟" : "What do I need to send or prepare for school?",
    answer: preparationItems,
  });
  questions.push({
    question: locale === "ar" ? "ما السؤال الذي يجب أن أطرحه على المعلم؟" : "What should I ask the teacher next?",
    answer: topQuestion,
  });
  questions.push({
    question:
      locale === "ar"
        ? (topLink ? "ما الرابط أو الملف الذي يجب أن أفتحه الآن؟" : "ما الموعد الذي لا يجب أن أفوّته؟")
        : (topLink ? "Which link or file should I open next?" : "What date should I not miss?"),
    answer: topLink ?? topDate,
  });

  if (teachers) {
    questions.push({
      question: locale === "ar" ? "من الأشخاص أو المواد المرتبطة بهذا التحديث؟" : "Who is involved in this update?",
      answer: teachers,
    });
  }

  return questions.slice(0, 4);
}

interface FollowUpPanelProps {
  summary: SummaryResult;
  locale: "en" | "ar";
}

export function FollowUpPanel({ summary, locale }: FollowUpPanelProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const isRtl = locale === "ar";

  useEffect(() => {
    setActiveIndex(null);
    setDismissed(false);
  }, [summary]);

  if (dismissed) {
    return null;
  }

  const questions = buildQuestions(summary, locale);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      lang={locale}
      className={cn(
        "mt-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-4",
        isRtl && "font-arabic text-right"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 shrink-0 text-[var(--primary)]" />
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {pick(COPY.title, locale)}
          </span>
          <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
            {pick(COPY.beta, locale)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          {pick(COPY.dismiss, locale)}
        </button>
      </div>

      <p className="mb-3 text-xs text-[var(--muted-foreground)]">
        {pick(COPY.subtitle, locale)}
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {questions.map(({ question, answer }, index) => (
          <div
            key={question}
            className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]"
          >
            <button
              type="button"
              onClick={() => setActiveIndex(activeIndex === index ? null : index)}
              aria-expanded={activeIndex === index}
              className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-start text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
            >
              <span>{question}</span>
              <ChevronRight
                className={cn(
                  "h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform",
                  activeIndex === index && "rotate-90"
                )}
              />
            </button>
            {activeIndex === index && (
              <div className="border-t border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
                {answer ? (
                  answer
                ) : (
                  <span className="text-[var(--muted-foreground)]">
                    {pick(COPY.noAnswer, locale)}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
