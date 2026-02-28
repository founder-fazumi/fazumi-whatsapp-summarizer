"use client";

import { useTheme } from "@/lib/context/ThemeContext";
import { useLang } from "@/lib/context/LangContext";
import { t } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sun, Moon, Globe } from "lucide-react";

export function SettingsPanel() {
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLang();

  return (
    <div className="space-y-4">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.theme", locale)}</CardTitle>
          <CardDescription>{t("settings.theme.desc", locale)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              onClick={() => { if (theme !== "light") toggleTheme(); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                theme === "light"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
              }`}
            >
              <Sun className="h-4 w-4" />
              {t("settings.light", locale)}
            </button>
            <button
              onClick={() => { if (theme !== "dark") toggleTheme(); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                theme === "dark"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
              }`}
            >
              <Moon className="h-4 w-4" />
              {t("settings.dark", locale)}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.lang", locale)}</CardTitle>
          <CardDescription>{t("settings.lang.desc", locale)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              onClick={() => setLocale("en")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                locale === "en"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
              }`}
            >
              <Globe className="h-4 w-4" />
              English
            </button>
            <button
              onClick={() => setLocale("ar")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                locale === "ar"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
              }`}
            >
              <Globe className="h-4 w-4" />
              العربية
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.account", locale)}</CardTitle>
          <CardDescription>{t("settings.account.desc", locale)}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("settings.account.manage", locale)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
