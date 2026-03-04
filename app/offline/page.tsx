"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";

const COPY = {
  title: {
    en: "You are offline",
    ar: "أنت غير متصل",
  },
  body: {
    en: "Cached pages still work when available. Reconnect to sync new summaries and notifications.",
    ar: "لا تزال الصفحات المخزنة تعمل عند توفرها. أعد الاتصال لمزامنة الملخصات والإشعارات الجديدة.",
  },
  available: {
    en: "Usually available offline",
    ar: "غالبًا متاح دون اتصال",
  },
  dashboard: {
    en: "Dashboard and recently visited pages",
    ar: "لوحة التحكم والصفحات التي تمت زيارتها مؤخرًا",
  },
  history: {
    en: "Summary history already cached on this device",
    ar: "سجل الملخصات المخزن مسبقًا على هذا الجهاز",
  },
  retry: {
    en: "Try again",
    ar: "حاول مرة أخرى",
  },
  home: {
    en: "Go home",
    ar: "العودة للرئيسية",
  },
} as const;

export default function OfflinePage() {
  const router = useRouter();
  const { locale } = useLang();
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const syncStatus = () => setIsOnline(navigator.onLine);

    syncStatus();
    window.addEventListener("online", syncStatus);
    window.addEventListener("offline", syncStatus);

    return () => {
      window.removeEventListener("online", syncStatus);
      window.removeEventListener("offline", syncStatus);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      router.replace("/dashboard");
    }
  }, [isOnline, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <Card className="w-full max-w-md bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
            <WifiOff className="h-6 w-6" />
          </div>
          <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)]">
            {locale === "ar" ? COPY.title.ar : COPY.title.en}
          </h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm leading-6 text-[var(--muted-foreground)]">
            {locale === "ar" ? COPY.body.ar : COPY.body.en}
          </p>

          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              {locale === "ar" ? COPY.available.ar : COPY.available.en}
            </p>
            <ul className="space-y-2 text-sm leading-6 text-[var(--foreground)]">
              <li>{locale === "ar" ? COPY.dashboard.ar : COPY.dashboard.en}</li>
              <li>{locale === "ar" ? COPY.history.ar : COPY.history.en}</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={() => window.location.reload()} className="flex-1">
              <RefreshCcw className="h-4 w-4" />
              {locale === "ar" ? COPY.retry.ar : COPY.retry.en}
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

          {isOnline ? (
            <p className="text-center text-xs text-[var(--muted-foreground)]">
              {locale === "ar" ? "تم استعادة الاتصال." : "Connection restored."}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
