"use client";

import { useEffect, useState } from "react";
import { Laptop, Moon, Sun } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { THEME_STORAGE_KEY } from "@/lib/preferences";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const THEME_MODE_STORAGE_KEY = "fazumi_theme_mode";

const COPY = {
  en: {
    label: "Theme",
    light: "Light",
    dark: "Dark",
    system: "System",
  },
  ar: {
    label: "السمة",
    light: "فاتح",
    dark: "داكن",
    system: "تلقائي",
  },
} as const;

const OPTIONS = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Laptop },
] as const satisfies readonly {
  value: ThemeMode;
  icon: typeof Sun;
}[];

function readStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const storedMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
  if (storedMode === "light" || storedMode === "dark" || storedMode === "system") {
    return storedMode;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : "system";
}

function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return mode;
}

function applyThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const resolvedTheme = resolveThemeMode(mode);

  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  window.localStorage.setItem(THEME_STORAGE_KEY, resolvedTheme);
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: THEME_STORAGE_KEY,
      newValue: resolvedTheme,
    })
  );
}

export function AdminThemeSwitcher() {
  const { locale } = useLang();
  const copy = COPY[locale];
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setThemeMode(readStoredThemeMode());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    applyThemeMode(themeMode);

    if (themeMode !== "system" || typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyThemeMode("system");

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [isReady, themeMode]);

  return (
    <div
      role="group"
      aria-label={copy.label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] p-1 shadow-[var(--shadow-xs)]",
        locale === "ar" && "font-arabic"
      )}
    >
      {OPTIONS.map(({ value, icon: Icon }) => {
        const isActive = themeMode === value;

        return (
          <button
            key={value}
            type="button"
            aria-pressed={isActive}
            aria-label={copy[value]}
            title={copy[value]}
            onClick={() => setThemeMode(value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{copy[value]}</span>
          </button>
        );
      })}
    </div>
  );
}
