import Link from "next/link";
import {
  CheckCircle2,
  Globe2,
  HeartHandshake,
  Lock,
  MapPinned,
  Sparkles,
} from "lucide-react";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pick } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const COPY = {
  eyebrow: { en: "About", ar: "من نحن" },
  title: { en: "Built by parents, for parents", ar: "صُمم من قبل أولياء الأمور، لأولياء الأمور" },
  description: {
    en: "Fazumi helps busy parents turn noisy school chats into clear next steps, dates, and follow-ups without endless scrolling.",
    ar: "يساعد فازومي الآباء والأمهات المشغولين على تحويل محادثات المدرسة المزدحمة إلى خطوات واضحة ومواعيد ومتابعات دون تمرير لا ينتهي.",
  },
  originBadge: { en: "Built in Doha for the GCC", ar: "صُمم في الدوحة من أجل الخليج" },
  bilingualBadge: { en: "Arabic + English by default", ar: "العربية والإنجليزية افتراضيًا" },
  highlights: [
    {
      title: { en: "Built for busy parents", ar: "مصمم للآباء والأمهات المشغولين" },
      body: {
        en: "Designed for the moments when you need the update quickly, not another long scroll.",
        ar: "صُمم للحظات التي تحتاج فيها إلى التحديث بسرعة، لا إلى تمرير أطول.",
      },
    },
    {
      title: { en: "Clarity from noisy school chats", ar: "وضوح وسط محادثات المدرسة المزدحمة" },
      body: {
        en: "Dates, actions, follow-ups, and context should be easy to scan and easy to share.",
        ar: "ينبغي أن تكون المواعيد والمهام والمتابعات والسياق سهلة الالتقاط وسهلة المشاركة.",
      },
    },
    {
      title: { en: "Privacy considered from the start", ar: "خصوصية حاضرة من البداية" },
      body: {
        en: "Fazumi is built to keep the useful structure, not a permanent archive of pasted chat threads.",
        ar: "صُمم فازومي للاحتفاظ بالبنية المفيدة، لا لتحويل المحادثات الملصقة إلى أرشيف دائم.",
      },
    },
  ],
  storyTitle: { en: "Why Fazumi exists", ar: "لماذا وُجد فازومي" },
  storyBody: {
    en: "As parents in Doha, we once missed our daughter's science-fair deadline because the reminder was buried inside 200+ WhatsApp messages. The information was there, but the signal was lost in the noise. Fazumi started as the tool we wanted that night: paste the chat, surface the dates, identify the actions, and share the summary with the whole family before anything slips again.",
    ar: "كأولياء أمور في الدوحة، فاتنا ذات مرة موعد معرض العلوم لابنتنا لأن التذكير كان مدفونًا داخل أكثر من 200 رسالة واتساب. كانت المعلومة موجودة، لكن الإشارة ضاعت وسط الضجيج. بدأ فازومي كالأداة التي تمنينا وجودها في تلك الليلة: الصق المحادثة، أظهر المواعيد، حدد الإجراءات، وشارك الملخص مع العائلة كلها قبل أن يفوت شيء مرة أخرى.",
  },
  founderTitle: { en: "How we think about the product", ar: "كيف نفكر في المنتج" },
  founderBody: {
    en: "Fazumi is shaped by parents who balance school, work, and family logistics every day. We care about reducing friction: faster scanning on mobile, clearer language, and summaries that make it obvious what happens next.",
    ar: "يتشكل فازومي على يد أولياء أمور يوازنون يوميًا بين المدرسة والعمل وتنظيم شؤون العائلة. ما نهتم به هو تقليل الاحتكاك: قراءة أسرع على الهاتف، ولغة أوضح، وملخصات تجعل الخطوة التالية واضحة مباشرة.",
  },
  founderListTitle: { en: "What we optimize for", ar: "ما الذي نركز عليه" },
  founderList: {
    en: [
      "Useful structure before visual noise.",
      "Bilingual clarity that feels natural in English and Arabic.",
      "A calmer experience on the phone, where most parents actually use it.",
    ],
    ar: [
      "بنية مفيدة قبل أي ازدحام بصري.",
      "وضوح ثنائي اللغة يبدو طبيعيًا في العربية والإنجليزية.",
      "تجربة أهدأ على الهاتف، حيث يستخدمه معظم أولياء الأمور فعلًا.",
    ],
  },
  missionTitle: { en: "Our mission", ar: "مهمتنا" },
  missionBody: {
    en: "Give parents a calmer way to understand school communication, act on time, and coordinate with family with less friction.",
    ar: "منح الأسر طريقة أهدأ لفهم تواصل المدرسة، والتصرف في الوقت المناسب، والتنسيق العائلي باحتكاك أقل.",
  },
  values: [
    {
      title: { en: "Privacy-first", ar: "الخصوصية أولًا" },
      body: {
        en: "We do not save raw chat text in the summaries database or account history. Fazumi keeps the structured result needed for the product to work.",
        ar: "لا نحفظ نص المحادثة الخام في قاعدة بيانات الملخصات أو سجل الحساب. يحتفظ فازومي بالنتيجة المنظمة اللازمة لعمل المنتج.",
      },
      icon: Lock,
    },
    {
      title: { en: "Built for GCC parents", ar: "مصمم لأولياء الأمور في الخليج" },
      body: {
        en: "Arabic and English support, regional school rhythms, and family-sharing habits are product assumptions, not afterthoughts.",
        ar: "دعم العربية والإنجليزية، وإيقاع المدارس في المنطقة، وعادات مشاركة العائلة هي افتراضات أساسية في المنتج وليست إضافات لاحقة.",
      },
      icon: Globe2,
    },
    {
      title: { en: "Clarity by default", ar: "الوضوح افتراضيًا" },
      body: {
        en: "The goal is not to show more. It is to surface the deadline, action, question, and context that matter most.",
        ar: "الهدف ليس عرض المزيد، بل إبراز الموعد والمهمة والسؤال والسياق الأكثر أهمية.",
      },
      icon: CheckCircle2,
    },
    {
      title: { en: "Always improving", ar: "نتحسن باستمرار" },
      body: {
        en: "We ship improvements from real parent feedback, especially around clarity, reliability, and calmer mobile use.",
        ar: "نطلق تحسينات مبنية على ملاحظات أولياء الأمور الحقيقية، خصوصًا فيما يتعلق بالوضوح والاعتمادية وتجربة الهاتف الأكثر هدوءًا.",
      },
      icon: Sparkles,
    },
  ],
  ctaTitle: { en: "Ready to try Fazumi?", ar: "هل أنت مستعد لتجربة فازومي؟" },
  ctaBody: {
    en: "Start your free trial and turn the next crowded school chat into one clear family-ready summary.",
    ar: "ابدأ تجربتك المجانية وحوّل المحادثة المدرسية المزدحمة التالية إلى ملخص واحد واضح وجاهز للعائلة.",
  },
  ctaButton: { en: "Start free trial", ar: "ابدأ التجربة المجانية" },
} as const;

export default function AboutPage() {
  const isArabic = false;
  const founderList = pick<readonly string[]>(COPY.founderList, "en");

  return (
    <PublicPageShell
      eyebrow={COPY.eyebrow}
      title={COPY.title}
      description={COPY.description}
    >
      <div
        dir={isArabic ? "rtl" : "ltr"}
        lang="en"
        className={cn("space-y-5", isArabic && "font-arabic")}
      >
        <Card className="hero-backdrop overflow-hidden">
          <CardContent className="flex flex-col gap-6 px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-wrap items-center gap-3">
              <BrandLogo size="lg" />
              <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)]">
                {pick(COPY.originBadge, "en")}
              </span>
              <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)]">
                {pick(COPY.bilingualBadge, "en")}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {COPY.highlights.map((highlight) => (
                <div
                  key={highlight.title.en}
                  className={cn(
                    "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]/90 p-4 shadow-[var(--shadow-xs)]",
                    isArabic && "text-right"
                  )}
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {pick(highlight.title, "en")}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
                    {pick(highlight.body, "en")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Card>
            <CardHeader className={cn(isArabic && "text-right")}>
              <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse")}>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <CardTitle>{pick(COPY.storyTitle, "en")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className={cn(isArabic && "text-right")}>
              <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                {pick(COPY.storyBody, "en")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={cn(isArabic && "text-right")}>
              <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse")}>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <MapPinned className="h-5 w-5" />
                </div>
                <CardTitle>{pick(COPY.founderTitle, "en")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className={cn("space-y-4", isArabic && "text-right")}>
              <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                {pick(COPY.founderBody, "en")}
              </p>
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {pick(COPY.founderListTitle, "en")}
                </p>
                <ul
                  className={cn(
                    "mt-3 list-disc space-y-2 text-sm leading-7 text-[var(--muted-foreground)]",
                    isArabic ? "pr-5 text-right" : "pl-5"
                  )}
                >
                  {founderList.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="hero-backdrop">
          <CardHeader className={cn(isArabic && "text-right")}>
            <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse")}>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <CardTitle>{pick(COPY.missionTitle, "en")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className={cn(isArabic && "text-right")}>
            <p className="text-sm leading-7 text-[var(--foreground)]">
              {pick(COPY.missionBody, "en")}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {COPY.values.map((value) => (
            <Card key={value.title.en}>
              <CardHeader className={cn(isArabic && "text-right")}>
                <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse")}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                    <value.icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{pick(value.title, "en")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className={cn(isArabic && "text-right")}>
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  {pick(value.body, "en")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
            <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", isArabic && "sm:flex-row-reverse")}>
              <div className={cn("max-w-2xl", isArabic && "text-right")}>
                <h2 className="text-2xl font-bold text-[var(--foreground)]">
                  {pick(COPY.ctaTitle, "en")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                  {pick(COPY.ctaBody, "en")}
                </p>
              </div>
              <Link
                href="/login?tab=signup"
                className="inline-flex h-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary)] px-6 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--primary-hover)]"
              >
                {pick(COPY.ctaButton, "en")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  );
}
