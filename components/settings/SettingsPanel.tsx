"use client";

import { useState } from "react";
import { useTheme } from "@/lib/context/ThemeContext";
import { useLang } from "@/lib/context/LangContext";
import { t, type Locale } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sun, Moon, Globe, Check } from "lucide-react";

async function savePrefs(patch: { theme_pref?: string; lang_pref?: string }) {
  try {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  } catch {
    // silently ignore — localStorage already applied
  }
}

export function SettingsPanel() {
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLang();
  const [savedKey, setSavedKey] = useState<"theme" | "lang" | null>(null);

  function flash(key: "theme" | "lang") {
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 1800);
  }

  async function handleTheme(next: "light" | "dark") {
    if (theme === next) return;
    toggleTheme();
    await savePrefs({ theme_pref: next });
    flash("theme");
  }

  async function handleLang(next: Locale) {
    if (locale === next) return;
    setLocale(next);
    await savePrefs({ lang_pref: next });
    flash("lang");
  }

  return (
    <div className="space-y-4">
      {/* Theme */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("settings.theme", locale)}</CardTitle>
              <CardDescription>{t("settings.theme.desc", locale)}</CardDescription>
            </div>
            {savedKey === "theme" && (
              <span className="flex items-center gap-1 text-xs font-medium text-[var(--primary)]">
                <Check className="h-3.5 w-3.5" /> {t("settings.saved", locale)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              onClick={() => handleTheme("light")}
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
              onClick={() => handleTheme("dark")}
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("settings.lang", locale)}</CardTitle>
              <CardDescription>{t("settings.lang.desc", locale)}</CardDescription>
            </div>
            {savedKey === "lang" && (
              <span className="flex items-center gap-1 text-xs font-medium text-[var(--primary)]">
                <Check className="h-3.5 w-3.5" /> {t("settings.saved", locale)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              onClick={() => handleLang("en")}
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
              onClick={() => handleLang("ar")}
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
