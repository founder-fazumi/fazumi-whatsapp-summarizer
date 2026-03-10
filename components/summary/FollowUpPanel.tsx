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
    en: "Tap a question to find the answer in this summary.",
    ar: "اضغط على سؤال للعثور على الإجابة في هذا الملخص.",
  },
  noAnswer: {
    en: "This wasn't mentioned — check with the teacher.",
    ar: "لم يُذكر هذا — تحقق مع المعلم.",
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

function buildQuestions(summary: SummaryResult, locale: "en" | "ar"): FollowUpQuestion[] {
  const questions: FollowUpQuestion[] = [];
  const topAction = summary.action_items[0] ?? null;
  const topDate = getTopDate(summary);
  const teachers = summary.people_classes.slice(0, 2).join(", ");
  const topLink = getTopLink(summary);

  questions.push({
    question: locale === "ar" ? "ماذا يحتاج طفلي أن يفعل؟" : "What does my child need to do?",
    answer: topAction,
  });
  questions.push({
    question: locale === "ar" ? "هل هناك مواعيد مهمة؟" : "Are there any important dates?",
    answer: topDate,
  });
  questions.push({
    question: locale === "ar" ? "من المعلمون المذكورون؟" : "Who are the teachers mentioned?",
    answer: teachers.length > 0 ? teachers : null,
  });

  if (topLink) {
    questions.push({
      question: locale === "ar" ? "هل هناك روابط يجب أن أفتحها؟" : "Are there links I should open?",
      answer: topLink,
    });
  }

  return questions;
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

      <div className="space-y-2">
        {questions.map(({ question, answer }, index) => (
          <div
            key={question}
            className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)]"
          >
            <button
              type="button"
              onClick={() => setActiveIndex(activeIndex === index ? null : index)}
              aria-expanded={activeIndex === index}
              className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2.5 text-start text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
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
              <div className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)]">
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
