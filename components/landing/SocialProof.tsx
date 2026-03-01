"use client";

import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const COPY = {
  headline: {
    en: "Trusted by parents across GCC schools",
    ar: "موثوق به من أولياء الأمور في مدارس الخليج",
  },
} satisfies Record<string, LocalizedCopy<string>>;

export function SocialProof() {
  const { locale } = useLang();
  const isArabic = locale === "ar";
  const stats = [
    {
      value: "12,500+",
      label: {
        en: "parents using Fazumi",
        ar: "ولي أمر يستخدمون Fazumi",
      },
    },
    {
      value: "94%",
      label: {
        en: "say it saves time daily",
        ar: "يقولون إنه يوفر الوقت يوميًا",
      },
    },
    {
      value: "EN / AR",
      label: {
        en: "bilingual output",
        ar: "مخرجات ثنائية اللغة",
      },
    },
    {
      value: "< 15 sec",
      label: {
        en: "average summary time",
        ar: "متوسط وقت التلخيص",
      },
    },
  ];

  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      lang={locale}
      className={cn("py-16 md:py-24", isArabic && "font-arabic")}
    >
      <div className="page-shell">
        <div className="surface-panel-elevated px-[var(--card-padding-lg)] py-8">
          <p
            className={cn(
              "mb-6 text-sm font-semibold tracking-widest text-[var(--muted-foreground)]",
              isArabic ? "text-right" : "text-center uppercase"
            )}
          >
            {pick(COPY.headline, locale)}
          </p>

          <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            {stats.map(({ value, label }) => (
              <div key={label.en} className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-4 py-5 shadow-[var(--shadow-xs)]">
                <p className="text-2xl font-bold text-[var(--primary)]">{value}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {pick(label, locale)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {["Al Wakra School", "Doha Academy", "SEK Qatar", "DPS Modern Indian", "ACS Doha"].map((name) => (
              <span key={name} className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--foreground)]">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
