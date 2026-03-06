"use client";

import { useMemo, useState } from "react";
import { Headphones, Mail, MessageSquareHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LEGAL_CONTACT_EMAIL } from "@/lib/config/legal";
import { useLang } from "@/lib/context/LangContext";
import { pick, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ContactMode = "feedback" | "support";
type FeedbackType = "feature" | "bug" | "praise" | "complaint";

const RATINGS = [
  { value: "love", emoji: "😍", label: "Loved it" },
  { value: "good", emoji: "🙂", label: "Pretty good" },
  { value: "okay", emoji: "😐", label: "Needs work" },
  { value: "bad", emoji: "😕", label: "Frustrating" },
  { value: "rough", emoji: "😩", label: "Very rough" },
] as const;

const SUPPORT_EMAIL = LEGAL_CONTACT_EMAIL;
const FEEDBACK_TYPES: Array<{
  value: FeedbackType;
  label: { en: string; ar: string };
}> = [
  {
    value: "feature",
    label: { en: "Idea or feature", ar: "فكرة أو ميزة" },
  },
  {
    value: "bug",
    label: { en: "Bug or issue", ar: "خلل أو مشكلة" },
  },
  {
    value: "praise",
    label: { en: "Praise", ar: "إطراء" },
  },
  {
    value: "complaint",
    label: { en: "Complaint", ar: "شكوى" },
  },
] as const;

const COPY = {
  errorShortMessage: {
    en: "Please write a message with at least 10 characters",
    ar: "الرجاء كتابة رسالة من 10 أحرف على الأقل",
  },
  errorEmail: {
    en: "Please enter a valid email address",
    ar: "الرجاء إدخال بريد إلكتروني صحيح",
  },
  successFeedback: {
    en: "Feedback saved. It is now visible in the admin feedback inbox.",
    ar: "تم حفظ الملاحظات. وهي ظاهرة الآن في صندوق ملاحظات الإدارة.",
  },
  successSupport: {
    en: "Support request saved. The admin support inbox received it.",
    ar: "تم حفظ طلب الدعم. وقد وصل إلى صندوق دعم الإدارة.",
  },
  submitError: {
    en: "We could not send your message right now. Please try again.",
    ar: "تعذر إرسال رسالتك الآن. حاول مرة أخرى.",
  },
} as const;

export function ContactForm() {
  const { locale } = useLang();
  const isArabic = locale === "ar";
  const [mode, setMode] = useState<ContactMode>("feedback");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("feature");
  const [rating, setRating] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submitLabel = useMemo(
    () =>
      submitting
        ? locale === "ar" ? "جارٍ الإرسال..." : "Sending..."
        : submitted
          ? locale === "ar" ? "تم الإرسال" : "Sent"
          : mode === "feedback"
            ? locale === "ar" ? "إرسال الملاحظات" : "Send feedback"
            : locale === "ar" ? "إرسال طلب الدعم" : "Send support request",
    [locale, mode, submitted, submitting]
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSubmitted(false);

    const formData = new FormData(e.currentTarget);
    const website = String(formData.get("company-website") ?? "");
    const trimmedMessage = message.trim();
    const trimmedEmail = email.trim();
    const trimmedSubject = subject.trim();

    if (website) {
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError(pick(COPY.errorEmail, locale));
      return;
    }

    if (trimmedMessage.length < 10) {
      setFormError(pick(COPY.errorShortMessage, locale));
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          email: trimmedEmail,
          phone: mobile.trim(),
          subject: trimmedSubject,
          message: trimmedMessage,
          locale,
          rating,
          feedbackType,
          website,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? pick(COPY.submitError, locale));
      }

      setSubmitted(true);
      setMessage("");
      setSubject("");
      setMobile("");
      setRating(null);
      setFeedbackType("feature");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : pick(COPY.submitError, locale)
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      lang={locale}
      className={cn("grid gap-6 lg:grid-cols-[1.2fr_0.8fr]", isArabic && "font-arabic")}
    >
      <Card>
        <CardHeader className={cn(isArabic && "text-right")}>
          <div className={cn("flex flex-wrap gap-2", isArabic && "justify-end")}>
            {([
              {
                mode: "feedback",
                icon: MessageSquareHeart,
                title: locale === "ar" ? "ملاحظات" : "Feedback",
                description: locale === "ar" ? "شارك ما كان واضحًا أو مربكًا أو يستحق التحسين." : "Share product feedback, ideas, and rough edges.",
              },
              {
                mode: "support",
                icon: Headphones,
                title: locale === "ar" ? t("contact.support", locale) : "Support",
                description: locale === "ar" ? "أبلغ عن مشكلة أو اطلب مساعدة بشأن الحساب أو الفوترة." : "Report an issue or ask for help with your account or billing.",
              },
            ] as const).map(({ mode: nextMode, icon: Icon, title, description }) => (
              <button
                key={nextMode}
                type="button"
                data-testid={`contact-mode-${nextMode}`}
                onClick={() => {
                  setMode(nextMode);
                  setFormError(null);
                  setSubmitted(false);
                }}
                className={cn(
                  "flex min-w-[180px] flex-1 items-start gap-3 rounded-2xl border px-4 py-3 transition-colors",
                  isArabic ? "text-right" : "text-left",
                  mode === nextMode
                    ? "border-[var(--primary)] bg-[var(--primary)]/8"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/30"
                )}
                aria-pressed={mode === nextMode}
              >
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">{title}</p>
                  <p className="mt-1 text-[var(--text-xs)] leading-relaxed text-[var(--muted-foreground)]">{description}</p>
                </div>
              </button>
            ))}
          </div>
          <CardTitle className="mt-4">
            {mode === "feedback"
              ? locale === "ar" ? "أخبرنا بما شعرت به" : "Tell us what you noticed"
              : locale === "ar" ? "أخبرنا بما تحتاج إليه" : "Tell us what you need help with"}
          </CardTitle>
          <CardDescription>
            {mode === "feedback"
              ? locale === "ar"
                ? "تصل الملاحظات مباشرة إلى صندوق ملاحظات الإدارة للتصنيف والمتابعة."
                : "Feedback goes straight into the admin feedback inbox for review."
              : locale === "ar"
                ? "تصل طلبات الدعم مباشرة إلى صندوق الدعم الإداري مع الحالة والأولوية."
                : "Support requests land directly in the admin support inbox with status and priority."}
          </CardDescription>
        </CardHeader>
        <CardContent className={cn(isArabic && "text-right")}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="hidden">
              <label htmlFor="company-website">Company Website</label>
              <input
                id="company-website"
                name="company-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                className="pointer-events-none absolute h-0 w-0 opacity-0"
              />
            </div>

            {mode === "feedback" && (
              <>
                <div className="space-y-2">
                  <label className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                    {locale === "ar" ? "كيف كانت التجربة؟" : "How was the experience?"}
                  </label>
                  <div className="grid gap-2 sm:grid-cols-5">
                    {RATINGS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setRating(item.value)}
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-center transition-colors",
                          rating === item.value
                            ? "border-[var(--primary)] bg-[var(--primary)]/8"
                            : "border-[var(--border)] hover:border-[var(--primary)]/30"
                        )}
                        aria-pressed={rating === item.value}
                      >
                        <span className="block text-2xl">{item.emoji}</span>
                        <span className="mt-1 block text-xs font-medium text-[var(--muted-foreground)]">
                          {locale === "ar"
                            ? item.value === "love" ? "أعجبني جدًا"
                              : item.value === "good" ? "جيد جدًا"
                              : item.value === "okay" ? "يحتاج تحسينًا"
                              : item.value === "bad" ? "مزعج"
                              : "صعب جدًا"
                            : item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-feedback-type" className="mb-2 block text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                    {locale === "ar" ? "نوع الملاحظة" : "Feedback type"}
                  </label>
                  <select
                    id="contact-feedback-type"
                    value={feedbackType}
                    onChange={(event) => setFeedbackType(event.target.value as FeedbackType)}
                    className="h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
                  >
                    {FEEDBACK_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {pick(item.label, locale)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-email" className="mb-2 block text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                  {locale === "ar" ? "البريد الإلكتروني" : "Email"}
                </label>
                <Input
                  id="contact-email"
                  type="email"
                  dir={isArabic ? "rtl" : "ltr"}
                  lang={locale}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={locale === "ar" ? "بريدك@مثال.كوم" : "you@example.com"}
                  className={cn("contact-input", isArabic && "text-right")}
                  required
                />
              </div>

              <div>
                <label htmlFor="contact-mobile" className="mb-2 block text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                  {locale === "ar" ? "الجوال (اختياري)" : "Mobile (optional)"}
                </label>
                <Input
                  id="contact-mobile"
                  type="tel"
                  dir={isArabic ? "rtl" : "ltr"}
                  lang={locale}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+966 5X XXX XXXX"
                  className={cn("contact-input", isArabic && "text-right")}
                />
              </div>
            </div>

            <div>
              <label htmlFor="contact-subject" className="mb-2 block text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                {locale === "ar" ? "العنوان" : "Subject"}
              </label>
              <Input
                id="contact-subject"
                data-testid="contact-subject"
                dir={isArabic ? "rtl" : "ltr"}
                lang={locale}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={
                  mode === "feedback"
                    ? locale === "ar"
                      ? "مثال: اقتراح لتسهيل قراءة الملخص"
                      : "Example: Idea to make summaries easier to scan"
                    : locale === "ar"
                      ? "مثال: لم تصلني رسالة الفوترة"
                      : "Example: Billing email did not arrive"
                }
                className={cn("contact-input", isArabic && "text-right")}
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="mb-2 block text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                {t("contact.message.label", locale)}
              </label>
              <Textarea
                id="contact-message"
                dir={isArabic ? "rtl" : "ltr"}
                lang={locale}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  mode === "feedback"
                    ? locale === "ar"
                      ? "ما الذي كان مفيدًا أو مربكًا أو يحتاج إلى تحسين؟"
                      : "What felt useful, confusing, or worth improving?"
                    : locale === "ar"
                      ? "صف المشكلة، وما الذي توقعته، وما الذي حدث بدلًا من ذلك."
                      : "Describe the issue, what you expected, and what happened instead."
                }
                className={cn("contact-input min-h-32", isArabic && "text-right")}
                required
              />
            </div>

            {submitted ? (
              <p
                data-testid="contact-success"
                className="rounded-[var(--radius)] border border-[var(--primary)]/20 bg-[var(--primary)]/8 px-4 py-3 text-[var(--text-sm)] text-[var(--text-strong)]"
                role="status"
                aria-live="polite"
              >
                {mode === "feedback"
                  ? pick(COPY.successFeedback, locale)
                  : pick(COPY.successSupport, locale)}
              </p>
            ) : null}

            {formError ? (
              <p className="text-[var(--text-sm)] text-[var(--destructive)]" role="alert" aria-live="polite">
                {formError}
              </p>
            ) : null}

            <Button type="submit" data-testid="contact-submit" className="w-full sm:w-auto" disabled={submitting}>
              {submitLabel}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className={cn("space-y-4", isArabic && "text-right")}>
        <Card>
          <CardHeader className={cn(isArabic && "text-right")}>
            <CardTitle>{locale === "ar" ? "كيف تصل الرسائل" : "How messages arrive"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
            <p>{locale === "ar" ? "يتم حفظ الرسائل على الخادم ثم تظهر في لوحة الإدارة تحت تبويبي الملاحظات والدعم." : "Messages are stored server-side and appear in the admin inbox under Feedback and Support."}</p>
            <p>{locale === "ar" ? "لا تحتاج إلى البريد الإلكتروني المحلي لإرسال الطلب." : "You do not need a local email app to submit a request."}</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-2 text-[var(--primary)] hover:underline"
            >
              <Mail className="h-4 w-4" />
              {SUPPORT_EMAIL}
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={cn(isArabic && "text-right")}>
            <CardTitle>{locale === "ar" ? "أفضل الرسائل تكون محددة" : "Best messages are specific"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
            <p>{locale === "ar" ? "اذكر الصفحة التي كنت فيها، وخيار اللغة، وآخر خطوة قمت بها قبل ظهور المشكلة." : "Include the page you were on, the language you used, and the last step before the issue."}</p>
            <p>{locale === "ar" ? "وبالنسبة للملاحظات، أخبرنا بما كان مفيدًا أو بطيئًا أو غير واضح." : "For feedback, tell us what felt helpful, slow, or unclear."}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
