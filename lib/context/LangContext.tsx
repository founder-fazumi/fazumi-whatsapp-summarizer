"use client";

import { createContext, useContext, useState } from "react";
import type { Locale } from "@/lib/i18n";

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
  const stored = localStorage.getItem("fazumi_lang");
  return stored === "ar" ? "ar" : "en";
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer — runs synchronously on first client render, reads localStorage
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  function setLocale(next: Locale) {
    setLocaleState(next);
    localStorage.setItem("fazumi_lang", next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
  }

  return (
    <LangContext.Provider value={{ locale, setLocale }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
