"use client";

import { useState } from "react";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";

const COPY = {
  title: { en: "Stay in the loop", ar: "ابقَ على اطلاع" },
  subtitle: {
    en: "Get notified when we launch new features like calendar sync, Arabic voice notes, and team accounts. No spam. Unsubscribe any time.",
    ar: "احصل على إشعار عند إطلاق ميزات جديدة مثل مزامنة التقويم والملاحظات الصوتية العربية وحسابات الفرق. بلا رسائل مزعجة.",
  },
  success: { en: "You're on the list. We'll be in touch.", ar: "تمت إضافتك إلى القائمة. سنتواصل معك." },
  placeholder: { en: "your@email.com", ar: "your@email.com" },
  loading: { en: "Subscribing…", ar: "جارٍ الاشتراك…" },
  button: { en: "Notify me", ar: "أخبرني" },
  privacy: { en: "No spam. Unsubscribe any time. We respect your privacy.", ar: "لا رسائل مزعجة. يمكنك إلغاء الاشتراك في أي وقت. نحن نحترم خصوصيتك." },
} satisfies Record<string, LocalizedCopy<string>>;

export function Newsletter() {
  const { locale } = useLang();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <section className="page-section-tight bg-[var(--page-layer)]">
      <div className="page-shell">
        <div className="hero-backdrop surface-panel-elevated mx-auto max-w-xl px-[var(--card-padding-lg)] py-[var(--card-padding-lg)] text-center">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10">
            <Mail className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
            {pick(COPY.title, locale)}
          </h2>
          <p className="mb-8 text-sm text-[var(--muted-foreground)]">
            {pick(COPY.subtitle, locale)}
          </p>

          {submitted ? (
            <div className="surface-panel flex items-center justify-center gap-2 px-6 py-5">
              <CheckCircle2 className="h-5 w-5 text-[var(--primary)]" />
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {pick(COPY.success, locale)}
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={pick(COPY.placeholder, locale)}
                  className="h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] pl-9 pr-4 text-sm text-[var(--foreground)] shadow-[var(--shadow-xs)] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70 whitespace-nowrap"
              >
                {loading ? pick(COPY.loading, locale) : pick(COPY.button, locale)}
                {!loading && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </form>
          )}

          <p className="mt-4 text-[11px] text-[var(--muted-foreground)]">
            {pick(COPY.privacy, locale)}
          </p>
        </div>
      </div>
    </section>
  );
}
