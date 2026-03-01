"use client";

import { Quote, UserRound } from "lucide-react";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { pick } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const COPY = {
  eyebrow: { en: "About", ar: "من نحن" },
  title: { en: "About Fazumi", ar: "عن Fazumi" },
  description: {
    en: "A calm, focused product for parents who want the signal from school chat noise.",
    ar: "منتج هادئ ومركز لأولياء الأمور الذين يريدون المهم وسط ضجيج رسائل المدرسة.",
  },
  sections: [
    {
      title: { en: "What Fazumi is", ar: "ما هو Fazumi" },
      body: {
        en: "Fazumi is a focused summarization tool that turns long school-group message threads into a clear, structured recap.",
        ar: "Fazumi أداة تلخيص مركزة تحول سلاسل رسائل مجموعات المدرسة الطويلة إلى خلاصة واضحة ومنظمة.",
      },
    },
    {
      title: { en: "Who it is for", ar: "لمن صُمم" },
      body: {
        en: "It is built for busy parents and guardians who want the important dates, tasks, and announcements without endless scrolling.",
        ar: "صُمم للآباء والأمهات وأولياء الأمور المشغولين الذين يريدون المواعيد والمهام والإعلانات المهمة من دون تمرير لا ينتهي.",
      },
    },
    {
      title: { en: "Mission", ar: "المهمة" },
      body: {
        en: "Our mission is simple: more calm, more clarity, and less scrolling for families trying to keep up with school life.",
        ar: "مهمتنا بسيطة: مزيد من الهدوء، ومزيد من الوضوح، وتمرير أقل للعائلات التي تحاول مواكبة الحياة المدرسية.",
      },
    },
    {
      title: { en: "What does Fazumi mean?", ar: "ماذا يعني Fazumi؟" },
      body: {
        en: "Fazumi is a made-up name we chose because it feels friendly, light, and easy to remember.",
        ar: "Fazumi اسم مبتكر اخترناه لأنه يبدو ودودًا وخفيفًا وسهل التذكر.",
      },
    },
  ],
  founder: {
    title: { en: "Founder", ar: "المؤسس" },
    body: {
      en: "Founder profile placeholder. We will add a short bio and photo before publishing a public founder profile.",
      ar: "هذا موضع مؤقت لملف المؤسس. سنضيف نبذة مختصرة وصورة قبل نشر الملف الشخصي العام.",
    },
    imageLabel: {
      en: "Founder image placeholder",
      ar: "موضع مؤقت لصورة المؤسس",
    },
  },
  quote: {
    title: { en: "A reminder we like", ar: "عبارة نحبها" },
    body: {
      en: "Stay hungry. Stay foolish.",
      ar: "ابقَ جائعًا. ابقَ أحمقًا.",
    },
    author: {
      en: "Steve Jobs",
      ar: "ستيف جوبز",
    },
  },
} as const;

export default function AboutPage() {
  const { locale } = useLang();
  const isArabic = locale === "ar";

  return (
    <PublicPageShell
      eyebrow={COPY.eyebrow}
      title={COPY.title}
      description={COPY.description}
    >
      <div
        dir={isArabic ? "rtl" : "ltr"}
        lang={locale}
        className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"
      >
        <div className="space-y-4">
          {COPY.sections.map((section) => (
            <Card key={section.title.en}>
              <CardHeader className={cn(isArabic && "text-right")}>
                <CardTitle>{pick(section.title, locale)}</CardTitle>
              </CardHeader>
              <CardContent className={cn(isArabic && "text-right")}>
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  {pick(section.body, locale)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className={cn(isArabic && "text-right")}>
              <CardTitle>{pick(COPY.founder.title, locale)}</CardTitle>
            </CardHeader>
            <CardContent className={cn("space-y-4", isArabic && "text-right")}>
              <div className="flex h-48 items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] text-[var(--muted-foreground)]">
                <div className={cn("flex flex-col items-center gap-3 text-center", isArabic && "font-arabic")}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                    <UserRound className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium">{pick(COPY.founder.imageLabel, locale)}</p>
                </div>
              </div>
              <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                {pick(COPY.founder.body, locale)}
              </p>
            </CardContent>
          </Card>

          <Card className="hero-backdrop">
            <CardHeader className={cn(isArabic && "text-right")}>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                <Quote className="h-5 w-5" />
              </div>
              <CardTitle>{pick(COPY.quote.title, locale)}</CardTitle>
            </CardHeader>
            <CardContent className={cn("space-y-3", isArabic && "text-right")}>
              <blockquote className="text-xl font-semibold leading-9 text-[var(--text-strong)]">
                {pick(COPY.quote.body, locale)}
              </blockquote>
              <p className="text-sm text-[var(--muted-foreground)]">{pick(COPY.quote.author, locale)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicPageShell>
  );
}
