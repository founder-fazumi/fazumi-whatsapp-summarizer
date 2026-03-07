"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { LANG_STORAGE_KEY } from "@/lib/preferences";

interface LangContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LangContext = createContext<LangContextValue>({
  locale: "ar",
  setLocale: () => {},
});

function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    return stored === "ar" ? "ar" : "en";
  } catch {
    return null;
  }
}

function applyLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}

function writeLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `${LANG_STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LangProvider({
  children,
  initialLocale = "ar",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const storedLocale = readStoredLocale();
    let frameId: number | null = null;

    if (storedLocale && storedLocale !== initialLocale) {
      frameId = window.requestAnimationFrame(() => {
        setLocaleState(storedLocale);
      });
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== LANG_STORAGE_KEY) return;
      setLocaleState(event.newValue === "ar" ? "ar" : "en");
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
    applyLocale(locale);
    writeLocaleCookie(locale);
  }, [locale]);

  function setLocale(next: Locale) {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures and keep the in-memory preference.
    }
    setLocaleState(next);
  }

  return (
    <LangContext.Provider value={{ locale, setLocale }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
