"use client";

import { Quote } from "lucide-react";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { pick } from "@/lib/i18n";

const SECTIONS = [
  {
    title: { en: "What Fazumi is", ar: "ما هو Fazumi" },
    body: {
      en: "Fazumi is a focused tool for parents who need the important signal from busy school chat threads: dates, tasks, decisions, and follow-ups.",
      ar: "Fazumi أداة مركزة لأولياء الأمور الذين يحتاجون إلى أهم ما في محادثات المدرسة المزدحمة: التواريخ والمهام والقرارات والمتابعات.",
    },
  },
  {
    title: { en: "What exists today", ar: "ما الموجود اليوم" },
    body: {
      en: "The current product is an MVP. Core summarization works, account flows exist, and the surrounding pages are still being tightened into a complete customer experience.",
      ar: "المنتج الحالي هو MVP. التلخيص الأساسي يعمل، وتدفقات الحساب موجودة، وما زالت الصفحات المحيطة تتحسن لتقديم تجربة متكاملة.",
    },
  },
  {
    title: { en: "What we are shaping next", ar: "ما الذي نطوره لاحقًا" },
    body: {
      en: "This placeholder page will eventually explain the story behind the product, the team, and the principles guiding product choices, privacy, and billing.",
      ar: "ستشرح هذه الصفحة لاحقًا قصة المنتج والفريق والمبادئ التي توجه قرارات المنتج والخصوصية والفوترة.",
    },
  },
] as const;

export default function AboutPage() {
  const { locale } = useLang();

  return (
    <PublicPageShell
      eyebrow={{ en: "About", ar: "من نحن" }}
      title={{ en: "About Fazumi", ar: "عن Fazumi" }}
      description={{ en: "A placeholder overview of the product, the problem it solves, and the direction it is heading.", ar: "نظرة عامة مبدئية على المنتج والمشكلة التي يحلها والاتجاه الذي يسير إليه." }}
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {SECTIONS.map((section) => (
            <Card key={section.title.en}>
              <CardHeader>
                <CardTitle>{pick(section.title, locale)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">{pick(section.body, locale)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{locale === "ar" ? "ملاحظة عن المنتج" : "Product note"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
              <Quote className="h-5 w-5" />
            </div>
            <blockquote className="text-lg font-semibold leading-8 text-[var(--foreground)]">
              {locale === "ar" ? "ابقَ جائعًا. ابقَ أحمقًا." : "Stay hungry. Stay foolish."}
            </blockquote>
            <p className="text-sm text-[var(--muted-foreground)]">{locale === "ar" ? "ستيف جوبز" : "Steve Jobs"}</p>
            <p className="text-sm leading-7 text-[var(--muted-foreground)]">
              {locale === "ar"
                ? "هذه العبارة تناسب المنتج: نستمر بفضول، لكن نحافظ على تجربة واضحة لأولياء الأمور المشغولين."
                : "That reminder fits this product well: keep building with curiosity, but keep the experience clear for busy parents."}
            </p>
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  );
}
