"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Shield } from "lucide-react";
import { AdminThemeSwitcher } from "@/components/admin/AdminThemeSwitcher";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/AdminNav";
import { useLang } from "@/lib/context/LangContext";
import { cn } from "@/lib/utils";

interface AdminShellProps {
  children: React.ReactNode;
  breadcrumb?: React.ReactNode;
}

const COPY = {
  en: {
    brand: "Fazumi Admin",
    subtitle: "Operations and inbox control center",
    title: "Admin dashboard",
    body: "Health, growth, revenue, inbox triage, and user controls",
    logout: "Log out",
    theme: "Theme",
    language: "Language",
  },
  ar: {
    brand: "فازومي ادمن",
    subtitle: "مركز تشغيل الصندوق والإدارة",
    title: "لوحة الإدارة",
    body: "الصحة والنمو والإيرادات وفرز الرسائل وأدوات المستخدمين",
    logout: "تسجيل الخروج",
    theme: "السمة",
    language: "اللغة",
  },
} as const;

export function AdminShell({ children, breadcrumb }: AdminShellProps) {
  const router = useRouter();
  const { locale, setLocale } = useLang();
  const copy = COPY[locale];
  const isRtl = locale === "ar";
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });
    } catch {
      // Ignore and continue to the admin login route.
    } finally {
      setIsLoggingOut(false);
    }

    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
      style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-sans)" }}
    >
      <div
        className={cn(
          "mx-auto flex min-h-screen w-full max-w-[var(--page-max)] flex-col",
          isRtl ? "lg:flex-row-reverse" : "lg:flex-row"
        )}
      >
        <aside
          className={cn(
            "hidden w-[280px] shrink-0 bg-[var(--glass-surface)] px-5 py-6 backdrop-blur lg:flex lg:flex-col",
            isRtl ? "border-l border-[var(--border)]" : "border-r border-[var(--border)]"
          )}
        >
          <div className="mb-8 flex items-center gap-3">
            <BrandLogo size="md" />
            <div>
              <p className="text-base font-bold text-[var(--text-strong)]">{copy.brand}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{copy.subtitle}</p>
            </div>
          </div>
          <AdminNav />
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--glass-surface)] backdrop-blur">
            <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)] lg:hidden">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[var(--text-strong)]">{copy.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{copy.body}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocale(locale === "en" ? "ar" : "en")}
                    className="gap-1"
                    aria-label={copy.language}
                  >
                    <Globe className="h-4 w-4" />
                    <span>{locale.toUpperCase()}</span>
                  </Button>

                  <AdminThemeSwitcher />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLoggingOut}
                    onClick={() => void handleLogout()}
                  >
                    {copy.logout}
                  </Button>
                </div>
              </div>

              {breadcrumb && (
                <div className="hidden md:block">
                  {breadcrumb}
                </div>
              )}

              <div className="lg:hidden">
                <AdminNav mobile />
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
