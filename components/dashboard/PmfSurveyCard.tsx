"use client";

import { useEffect, useState } from "react";
import { MessageSquareQuote } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { useLang } from "@/lib/context/LangContext";
import { cn } from "@/lib/utils";

type PmfResponseValue =
  | "very_disappointed"
  | "somewhat_disappointed"
  | "not_disappointed";

const COPY = {
  en: {
    title: "PMF check-in",
    description: "Superhuman-style survey for repeat users.",
    question: "How would you feel if you could no longer use Fazumi?",
    very: "Very disappointed",
    somewhat: "Somewhat disappointed",
    not: "Not disappointed",
    benefitLabel: "What is the biggest benefit Fazumi gives your family?",
    benefitPlaceholder: "Example: I stop missing school fees and forms.",
    missingLabel: "What would you miss most if it disappeared?",
    missingPlaceholder: "Example: the clean action list and shared calendar export.",
    save: "Save response",
    saving: "Saving...",
    saved: "Thanks. Your response is saved.",
  },
  ar: {
    title: "قياس ملاءمة المنتج",
    description: "استبيان على طريقة Superhuman للمستخدمين المتكررين.",
    question: "كيف ستشعر إذا لم يعد بإمكانك استخدام Fazumi؟",
    very: "سأشعر بخيبة كبيرة",
    somewhat: "سأشعر بخيبة إلى حد ما",
    not: "لن أشعر بخيبة",
    benefitLabel: "ما أكبر فائدة يعطيها Fazumi لعائلتك؟",
    benefitPlaceholder: "مثال: لم أعد أفوّت الرسوم والنماذج المدرسية.",
    missingLabel: "ما أكثر شيء ستفتقده إذا اختفى؟",
    missingPlaceholder: "مثال: قائمة الإجراءات الواضحة وتصدير التقويم المشترك.",
    save: "احفظ الرد",
    saving: "جارٍ الحفظ...",
    saved: "شكرًا. تم حفظ ردك.",
  },
} as const;

const RESPONSE_OPTIONS: PmfResponseValue[] = [
  "very_disappointed",
  "somewhat_disappointed",
  "not_disappointed",
];

export function PmfSurveyCard({ summaryCount }: { summaryCount: number }) {
  const { locale } = useLang();
  const copy = COPY[locale];
  const isRtl = locale === "ar";
  const [response, setResponse] = useState<PmfResponseValue | null>(null);
  const [benefit, setBenefit] = useState("");
  const [missingIfGone, setMissingIfGone] = useState("");
  const [loading, setLoading] = useState(summaryCount >= 2);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (summaryCount < 2) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadResponse() {
      try {
        const res = await fetch("/api/pmf", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as {
          response?: {
            response?: PmfResponseValue;
            biggest_benefit?: string | null;
            missing_if_gone?: string | null;
          } | null;
        } | null;

        if (!active || !data?.response) {
          return;
        }

        setResponse(data.response.response ?? null);
        setBenefit(data.response.biggest_benefit ?? "");
        setMissingIfGone(data.response.missing_if_gone ?? "");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadResponse();

    return () => {
      active = false;
    };
  }, [summaryCount]);

  if (summaryCount < 2) {
    return null;
  }

  async function handleSubmit() {
    if (!response || saving) {
      return;
    }

    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/pmf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response,
          biggest_benefit: benefit,
          missing_if_gone: missingIfGone,
        }),
      });

      if (!res.ok) {
        return;
      }

      trackEvent(AnalyticsEvents.PMF_SURVEY_SUBMITTED, {
        response,
        summaryCount,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="bg-[var(--surface-elevated)]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary)]">
            <MessageSquareQuote className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-4", isRtl && "text-right")}>
        {loading ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            {locale === "ar" ? "جارٍ تحميل الاستبيان..." : "Loading survey..."}
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {copy.question}
              </p>
              <div className="flex flex-wrap gap-2">
                {RESPONSE_OPTIONS.map((value) => {
                  const label =
                    value === "very_disappointed"
                      ? copy.very
                      : value === "somewhat_disappointed"
                        ? copy.somewhat
                        : copy.not;
                  const active = response === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setResponse(value)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                        active
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--foreground)]">
                {copy.benefitLabel}
              </label>
              <Textarea
                value={benefit}
                onChange={(event) => setBenefit(event.target.value)}
                placeholder={copy.benefitPlaceholder}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--foreground)]">
                {copy.missingLabel}
              </label>
              <Textarea
                value={missingIfGone}
                onChange={(event) => setMissingIfGone(event.target.value)}
                placeholder={copy.missingPlaceholder}
                rows={3}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => void handleSubmit()} disabled={!response || saving}>
                {saving ? copy.saving : copy.save}
              </Button>
              {saved && (
                <span className="text-sm text-[var(--success)]">
                  {copy.saved}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
