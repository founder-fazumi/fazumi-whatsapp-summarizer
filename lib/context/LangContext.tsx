"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Locale, SiteLocale } from "@/lib/i18n";
import { LANG_STORAGE_KEY } from "@/lib/preferences";

interface LangContextValue {
  /** Narrowed to "en" | "ar" — used by all existing dashboard components unchanged. */
  locale: Locale;
  /** Full website locale including es, pt-BR, id. Use in landing pages and the language switcher. */
  siteLocale: SiteLocale;
  setLocale: (l: SiteLocale) => void;
}

const LangContext = createContext<LangContextValue>({
  locale: "ar",
  siteLocale: "ar",
  setLocale: () => {},
});

const VALID_SITE_LOCALES: readonly SiteLocale[] = ["en", "ar", "es", "pt-BR", "id"];

function readStoredLocale(): SiteLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && (VALID_SITE_LOCALES as readonly string[]).includes(stored)) {
      return stored as SiteLocale;
    }
    return null;
  } catch {
    return null;
  }
}

function toLocale(sl: SiteLocale): Locale {
  return sl === "ar" ? "ar" : "en";
}

function applyLocale(sl: SiteLocale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = sl;
  document.documentElement.dir = sl === "ar" ? "rtl" : "ltr";
}

function writeLocaleCookie(sl: SiteLocale) {
  if (typeof document === "undefined") return;
  document.cookie = `${LANG_STORAGE_KEY}=${sl}; path=/; max-age=31536000; samesite=lax`;
}

export function LangProvider({
  children,
  initialLocale = "ar",
}: {
  children: React.ReactNode;
  initialLocale?: SiteLocale;
}) {
  const [siteLocale, setSiteLocale] = useState<SiteLocale>(initialLocale);

  useEffect(() => {
    const storedLocale = readStoredLocale();
    let frameId: number | null = null;

    if (storedLocale && storedLocale !== initialLocale) {
      frameId = window.requestAnimationFrame(() => {
        setSiteLocale(storedLocale);
      });
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== LANG_STORAGE_KEY) return;
      const next = event.newValue;
      if (next && (VALID_SITE_LOCALES as readonly string[]).includes(next)) {
        setSiteLocale(next as SiteLocale);
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("storage", handleStorage);
    };
  }, [initialLocale]);

  useEffect(() => {
    applyLocale(siteLocale);
    writeLocaleCookie(siteLocale);
  }, [siteLocale]);

  function setLocale(next: SiteLocale) {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures and keep the in-memory preference.
    }
    setSiteLocale(next);
  }

  return (
    <LangContext.Provider value={{ locale: toLocale(siteLocale), siteLocale, setLocale }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
