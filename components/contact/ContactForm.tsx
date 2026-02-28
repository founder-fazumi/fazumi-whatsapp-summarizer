"use client";

import { useMemo, useState } from "react";
import { Headphones, Mail, MessageSquareHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/lib/context/LangContext";
import { cn } from "@/lib/utils";

type ContactMode = "feedback" | "support";

const RATINGS = [
  { value: "love", emoji: "😍", label: "Loved it" },
  { value: "good", emoji: "🙂", label: "Pretty good" },
  { value: "okay", emoji: "😐", label: "Needs work" },
  { value: "bad", emoji: "😕", label: "Frustrating" },
  { value: "rough", emoji: "😩", label: "Very rough" },
] as const;

const SUPPORT_EMAIL = "support@fazumi.app";

export function ContactForm() {
  const { locale } = useLang();
  const isArabic = locale === "ar";
  const [mode, setMode] = useState<ContactMode>("feedback");
  const [rating, setRating] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitLabel = useMemo(
    () =>
      submitted
        ? locale === "ar" ? "✓ تم فتح تطبيق البريد" : "✓ Opening your email app…"
        : mode === "feedback"
          ? locale === "ar" ? "إرسال الملاحظات" : "Send feedback"
          : locale === "ar" ? "إرسال طلب الدعم" : "Send support request",
    [locale, mode, submitted]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const subject =
      mode === "feedback"
        ? locale === "ar" ? "ملاحظات Fazumi" : "Fazumi feedback"
        : locale === "ar" ? "طلب دعم Fazumi" : "Fazumi support request";

    const bodySections = [
      mode === "feedback"
        ? locale === "ar" ? `النوع: ملاحظات` : `Type: Feedback`
        : locale === "ar" ? `النوع: دعم` : `Type: Support`,
      rating
        ? locale === "ar" ? `التقييم: ${rating}` : `Rating: ${rating}`
        : null,
      locale === "ar" ? `البريد الإلكتروني: ${email}` : `Email: ${email}`,
      mobile
        ? locale === "ar" ? `الجوال: ${mobile}` : `Mobile: ${mobile}`
        : null,
      "",
      locale === "ar" ? "الرسالة:" : "Message:",
      message,
    ].filter((value): value is string => value !== null);

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodySections.join("\n"))}`;
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
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
                description: locale === "ar" ? "شارك ملاحظاتك وأفكارك والنقاط غير الواضحة." : "Share product feedback, ideas, and rough edges.",
              },
              {
                mode: "support",
                icon: Headphones,
                title: locale === "ar" ? "دعم" : "Support",
                description: locale === "ar" ? "أبلغ عن مشكلة أو اطلب المساعدة بخصوص حسابك." : "Report an issue or ask for help with your account.",
              },
            ] as const).map(({ mode: nextMode, icon: Icon, title, description }) => (
              <button
                key={nextMode}
                type="button"
                onClick={() => setMode(nextMode)}
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
                  <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{description}</p>
                </div>
              </button>
            ))}
          </div>
          <CardTitle className="mt-4">
            {mode === "feedback"
              ? locale === "ar" ? "أخبرنا برأيك" : "Tell us what you think"
              : locale === "ar" ? "أخبرنا بما حدث" : "Tell us what went wrong"}
          </CardTitle>
          <CardDescription>
            {mode === "feedback"
              ? locale === "ar"
                ? "يفتح بريدك الإلكتروني مع رسالة ملاحظات جاهزة للإرسال."
                : "Opens your email app with a prefilled feedback draft."
              : locale === "ar"
                ? "يفتح بريدك الإلكتروني مع رسالة دعم جاهزة للإرسال."
                : "Opens your email app with a prefilled support request."}
          </CardDescription>
        </CardHeader>
        <CardContent className={cn(isArabic && "text-right")}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "feedback" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  {locale === "ar" ? "كيف كانت تجربتك؟" : "How was your experience?"}
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
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className={mode === "support" ? "sm:col-span-2" : ""}>
                <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
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
                  className={cn(isArabic && "text-right")}
                  required
                />
              </div>

              {mode === "feedback" && (
                <div>
                  <label htmlFor="contact-mobile" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                    {locale === "ar" ? "الجوال" : "Mobile"}
                  </label>
                  <Input
                    id="contact-mobile"
                    type="tel"
                    dir={isArabic ? "rtl" : "ltr"}
                    lang={locale}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+974 5555 5555"
                    className={cn(isArabic && "text-right")}
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                {locale === "ar" ? "الرسالة" : "Message"}
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
                      ? "صف المشكلة وما الذي توقعته وما الذي حدث بدلًا من ذلك."
                      : "Describe the issue, what you expected, and what happened instead."
                }
                className={cn(isArabic && "text-right")}
                required
              />
            </div>

            <Button type="submit" className="w-full sm:w-auto" disabled={submitted}>
              {submitLabel}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className={cn("space-y-4", isArabic && "text-right")}>
        <Card>
          <CardHeader className={cn(isArabic && "text-right")}>
            <CardTitle>{locale === "ar" ? "كيف نتواصل" : "How to reach us"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
            <p>{locale === "ar" ? "زر الإرسال يفتح تطبيق البريد لديك مع الموضوع والرسالة مجهزين." : "Submitting opens your email client with the subject and message prefilled."}</p>
            <p>{locale === "ar" ? "يمكنك أيضًا مراسلتنا مباشرة إذا كان نموذج المتصفح لا يناسبك." : "You can also email us directly if the browser form is not convenient."}</p>
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
            <CardTitle>{locale === "ar" ? "أفضل الملاحظات تكون محددة" : "Best notes are specific"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
            <p>{locale === "ar" ? "اذكر الصفحة التي كنت فيها ومفتاح اللغة الذي استخدمته وآخر خطوة قبل المشكلة." : "Include the page you were on, the language toggle you used, and the last step before the issue."}</p>
            <p>{locale === "ar" ? "وبالنسبة للملاحظات، أخبرنا بما كان بطيئًا أو غير واضح أو مفيدًا بشكل غير متوقع." : "For feedback, tell us what felt slow, unclear, or unexpectedly helpful."}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
