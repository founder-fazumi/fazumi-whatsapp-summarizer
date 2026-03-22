"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { captureRouteException } from "@/lib/sentry";

const COPY = {
  title: {
    en: "Something went wrong",
    ar: "حدث خطأ ما",
  },
  body: {
    en: "We logged the issue. Retry the page or return to the overview if the problem persists.",
    ar: "تم تسجيل المشكلة. أعد المحاولة أو ارجع إلى لوحة التحكم إذا استمرت المشكلة.",
  },
  retry: {
    en: "Try again",
    ar: "إعادة المحاولة",
  },
  back: {
    en: "Back to overview",
    ar: "العودة إلى النظرة العامة",
  },
} as const;

export function AdminRouteError({
  error,
  reset,
  route,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  route: string;
}) {
  const { locale } = useLang();
  const currentLocale = locale === "ar" ? "ar" : "en";

  useEffect(() => {
    void captureRouteException(error, {
      route,
      requestId: route,
      digest: error.digest,
    });
  }, [error, route]);

  return (
    <AdminShell>
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-lg bg-[var(--surface-elevated)]">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning)]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">
              {COPY.title[currentLocale]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm leading-6 text-[var(--muted-foreground)]">
              {COPY.body[currentLocale]}
            </p>
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs text-[var(--muted-foreground)]">
              <p className="font-semibold text-[var(--text-strong)]">Error</p>
              <p className="mt-1 break-words">{error.message}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" onClick={reset}>
                <RefreshCcw className="h-4 w-4" />
                {COPY.retry[currentLocale]}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.assign("/admin-dashboard")}
              >
                {COPY.back[currentLocale]}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
