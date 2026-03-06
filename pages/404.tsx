"use client";

import { useEffect, useState } from "react";
import { NotFoundScreen } from "@/components/errors/NotFoundScreen";
import type { Locale } from "@/lib/i18n";
import { LANG_STORAGE_KEY } from "@/lib/preferences";

function readStoredLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }

  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "ar") {
      return "ar";
    }
  } catch {
    // Ignore localStorage failures and fall back to cookies.
  }

  const cookieMatch = document.cookie.match(
    new RegExp(`(?:^|; )${LANG_STORAGE_KEY}=([^;]+)`)
  );
  return cookieMatch?.[1] === "ar" ? "ar" : "en";
}

export default function Custom404Page() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    setLocale(readStoredLocale());
  }, []);

  return <NotFoundScreen locale={locale} />;
}
