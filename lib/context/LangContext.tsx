"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import type { Locale } from "@/lib/i18n";

const LANG_STORAGE_KEY = "fazumi_lang";
const langListeners = new Set<() => void>();

interface LangContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LangContext = createContext<LangContextValue>({
  locale: "en",
  setLocale: () => {},
});

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return stored === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

function applyLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}

function subscribeLocale(listener: () => void) {
  langListeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      langListeners.delete(listener);
    };
  }

  function handleStorage(event: StorageEvent) {
    if (event.key !== LANG_STORAGE_KEY) return;
    applyLocale(event.newValue === "ar" ? "ar" : "en");
    listener();
  }

  window.addEventListener("storage", handleStorage);

  return () => {
    langListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function emitLocaleChange() {
  for (const listener of langListeners) {
    listener();
  }
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore<Locale>(
    subscribeLocale,
    readStoredLocale,
    () => "en"
  );

  function setLocale(next: Locale) {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures and keep the in-memory preference.
    }
    applyLocale(next);
    emitLocaleChange();
  }

  return (
    <LangContext.Provider value={{ locale, setLocale }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
