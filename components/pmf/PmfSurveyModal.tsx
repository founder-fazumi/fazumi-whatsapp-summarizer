"use client";

import { useEffect, useState } from "react";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SEEN_KEY = "fazumi_pmf_survey_seen";
const MIN_SUMMARY_COUNT = 3;

type PmfResponseValue =
  | "very_disappointed"
  | "somewhat_disappointed"
  | "not_disappointed";

const RESPONSE_OPTIONS: PmfResponseValue[] = [
  "very_disappointed",
  "somewhat_disappointed",
  "not_disappointed",
];

const RESPONSE_COPY: Record<PmfResponseValue, LocalizedCopy<string>> = {
  very_disappointed: {
    en: "Very disappointed",
    ar: "محبط جداً",
  },
  somewhat_disappointed: {
    en: "Somewhat disappointed",
    ar: "محبط نوعاً ما",
  },
  not_disappointed: {
    en: "Not disappointed",
    ar: "غير محبط",
  },
};

const COPY = {
  eyebrow: {
    en: "One quick question",
    ar: "سؤال سريع واحد",
  },
  question: {
    en: "How would you feel if you could no longer use Fazumi?",
    ar: "كيف ستشعر إذا لم تستطع استخدام Fazumi بعد الآن؟",
  },
  submit: {
    en: "Send response",
    ar: "أرسل الرد",
  },
  submitting: {
    en: "Saving...",
    ar: "جارٍ الحفظ...",
  },
} satisfies Record<string, LocalizedCopy<string>>;

interface PmfSurveyModalProps {
  summaryCount: number;
}

export function PmfSurveyModal({ summaryCount }: PmfSurveyModalProps) {
  const { locale } = useLang();
  const isRtl = locale === "ar";
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<PmfResponseValue | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (summaryCount < MIN_SUMMARY_COUNT) {
      setOpen(false);
      return;
    }

    const seen = window.localStorage.getItem(SEEN_KEY);
    if (seen) {
      setOpen(false);
      return;
    }

    let active = true;

    async function loadExistingResponse() {
      try {
        const res = await fetch("/api/pmf", { cache: "no-store" });
        const payload = (await res.json().catch(() => null)) as {
          response?: {
            response?: PmfResponseValue | null;
          } | null;
        } | null;

        if (!active) {
          return;
        }

        if (res.ok && payload?.response?.response) {
          window.localStorage.setItem(SEEN_KEY, "1");
          setOpen(false);
          return;
        }

        setOpen(true);
      } catch {
        if (active) {
          setOpen(true);
        }
      }
    }

    void loadExistingResponse();

    return () => {
      active = false;
    };
  }, [summaryCount]);

  function dismiss() {
    window.localStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  }

  async function handleSubmit() {
    if (!response || saving) {
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/pmf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ response }),
      });

      if (res.ok) {
        trackEvent(AnalyticsEvents.PMF_SURVEY_SUBMITTED, {
          response,
          summaryCount,
        });
      }
    } catch {
      // Dismiss on error to avoid repeatedly blocking the summarize flow.
    } finally {
      dismiss();
      setSaving(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      data-testid="pmf-survey-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pmf-survey-title"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4"
      onClick={dismiss}
    >
      <div
        dir={isRtl ? "rtl" : "ltr"}
        lang={locale}
        className={cn(
          "relative w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)]",
          isRtl && "font-arabic text-right"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
              {pick(COPY.eyebrow, locale)}
            </p>
            <h2
              id="pmf-survey-title"
              className="text-[var(--text-xl)] font-bold text-[var(--foreground)]"
            >
              {pick(COPY.question, locale)}
            </h2>
          </div>

          <fieldset className="space-y-3">
            <legend className="sr-only">{pick(COPY.question, locale)}</legend>
            {RESPONSE_OPTIONS.map((option) => {
              const selected = response === option;

              return (
                <label
                  key={option}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-[var(--radius)] border px-4 py-3 transition-colors",
                    selected
                      ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/40"
                  )}
                >
                  <input
                    type="radio"
                    name="pmf-response"
                    value={option}
                    checked={selected}
                    onChange={() => setResponse(option)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {pick(RESPONSE_COPY[option], locale)}
                  </span>
                </label>
              );
            })}
          </fieldset>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!response || saving}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? pick(COPY.submitting, locale) : pick(COPY.submit, locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
