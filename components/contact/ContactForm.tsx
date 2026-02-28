"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Headphones, MessageSquareHeart } from "lucide-react";
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

export function ContactForm() {
  const { locale } = useLang();
  const isArabic = locale === "ar";
  const [mode, setMode] = useState<ContactMode>("feedback");
  const [rating, setRating] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState("");
  const [submittedMode, setSubmittedMode] = useState<ContactMode | null>(null);

  const submitLabel = useMemo(
    () =>
      mode === "feedback"
        ? locale === "ar" ? "إرسال الملاحظات" : "Send feedback"
        : locale === "ar" ? "إرسال طلب الدعم" : "Send support request",
    [locale, mode]
  );

  function resetForm(nextMode = mode) {
    setMode(nextMode);
    setRating(null);
    setEmail("");
    setMobile("");
    setMessage("");
    setSubmittedMode(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmittedMode(mode);
    setEmail("");
    setMobile("");
    setMessage("");
    setRating(null);
  }

  if (submittedMode) {
    return (
      <Card dir={isArabic ? "rtl" : "ltr"} lang={locale} className={cn(isArabic && "font-arabic")}>
        <CardContent className={cn("flex flex-col gap-4 py-8", isArabic && "items-end text-right")}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              {submittedMode === "feedback"
                ? locale === "ar" ? "شكرًا على الملاحظات" : "Thanks for the feedback"
                : locale === "ar" ? "تم استلام طلب الدعم" : "Support request received"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              {submittedMode === "feedback"
                ? locale === "ar"
                  ? "نقرأ كل ملاحظة ونستخدمها لتحسين تجربة المنتج."
                  : "We read every note and use it to tighten the product experience."
                : locale === "ar"
                  ? "شكرًا لتواصلك. سنراجع المشكلة ونتابع معك بناءً على التفاصيل التي شاركتها."
                  : "Thanks for reaching out. We will review the issue and follow up with the context you shared."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => resetForm(submittedMode)}>
              {locale === "ar" ? "إرسال رسالة أخرى" : "Send another"}
            </Button>
            <Button type="button" variant="outline" onClick={() => resetForm("feedback")}>
              {locale === "ar" ? "العودة إلى النموذج" : "Back to contact form"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
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
                ? "محلي فقط حاليًا. استخدمه لترك ملاحظات سريعة عن المنتج."
                : "Client-only for now. Use this to leave quick product feedback."
              : locale === "ar"
                ? "محلي فقط حاليًا. استخدمه لمحاكاة تدفق طلب الدعم."
                : "Client-only for now. Use this to simulate a support request flow."}
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

            <Button type="submit" className="w-full sm:w-auto">
              {submitLabel}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className={cn("space-y-4", isArabic && "text-right")}>
        <Card>
          <CardHeader className={cn(isArabic && "text-right")}>
            <CardTitle>{locale === "ar" ? "ماذا تتوقع" : "What to expect"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
            <p>{locale === "ar" ? "وضع الملاحظات يجمع تقييمًا سريعًا وبيانات التواصل ورسالتك." : "Feedback mode collects a quick sentiment, your contact details, and a message."}</p>
            <p>{locale === "ar" ? "وضع الدعم أبسط: بريد إلكتروني مع وصف للمشكلة." : "Support mode keeps it narrower: email plus the issue description."}</p>
            <p>{locale === "ar" ? "لا يوجد تخزين خلفي موصول هنا بعد. هذه الصفحة تؤكد التدفق محليًا فقط." : "No backend storage is wired here yet. This page just confirms the flow client-side."}</p>
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
