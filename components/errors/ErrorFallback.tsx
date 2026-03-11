"use client";

import { Home, RefreshCcw } from "lucide-react";
import { MascotArt } from "@/components/shared/MascotArt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
  fullScreen?: boolean;
}

const COPY = {
  title: {
    en: "Something went wrong",
    ar: "حدث خطأ ما",
  },
  body: {
    en: "We logged the issue. Refresh the view or go back to the dashboard.",
    ar: "تم تسجيل المشكلة. حاول تحديث الصفحة أو العودة إلى لوحة التحكم.",
  },
  technical: {
    en: "Technical details",
    ar: "التفاصيل التقنية",
  },
  refresh: {
    en: "Try again",
    ar: "حاول مرة أخرى",
  },
  home: {
    en: "Go home",
    ar: "العودة للرئيسية",
  },
} as const;

export function ErrorFallback({
  error,
  onReset,
  fullScreen = false,
}: ErrorFallbackProps) {
  const { locale } = useLang();

  return (
    <div
      className={
        fullScreen
          ? "flex min-h-screen items-center justify-center px-4 py-10"
          : "flex min-h-[420px] items-center justify-center px-4 py-8"
      }
    >
      <Card className="w-full max-w-lg bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 rounded-[var(--radius-xl)] bg-[var(--surface-muted)] p-3">
            <MascotArt
              variant="error"
              alt={locale === "ar" ? "تميمة Fazumi في حالة تنبيه" : "Fazumi mascot in an alert state"}
              size={120}
              className="h-28 w-28"
              priority
            />
          </div>
          <CardTitle className="text-xl text-[var(--text-strong)]">
            {locale === "ar" ? COPY.title.ar : COPY.title.en}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm leading-6 text-[var(--muted-foreground)]">
            {locale === "ar" ? COPY.body.ar : COPY.body.en}
          </p>

          {error ? (
            <details className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <summary className="cursor-pointer text-xs font-medium text-[var(--muted-foreground)]">
                {locale === "ar" ? COPY.technical.ar : COPY.technical.en}
              </summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-[var(--destructive)]">
                {error.message}
              </pre>
            </details>
          ) : null}

          <div className="flex gap-2">
            <Button type="button" onClick={onReset} className="flex-1">
              <RefreshCcw className="h-4 w-4" />
              {locale === "ar" ? COPY.refresh.ar : COPY.refresh.en}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.assign("/")}
              className="flex-1"
            >
              <Home className="h-4 w-4" />
              {locale === "ar" ? COPY.home.ar : COPY.home.en}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
