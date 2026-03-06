"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type ErrorLocale = "en" | "ar";

interface StandaloneErrorScreenProps {
  error: Error | null;
  onReset: () => void;
  scope: "route" | "global";
}

const COPY = {
  route: {
    eyebrow: {
      en: "Route Error",
      ar: "خطأ في الصفحة",
    },
    title: {
      en: "This page hit a problem.",
      ar: "حدثت مشكلة أثناء تحميل هذه الصفحة.",
    },
    body: {
      en: "We logged the issue. Retry this view or go back to the homepage.",
      ar: "تم تسجيل المشكلة. أعد تحميل هذه الصفحة أو ارجع إلى الصفحة الرئيسية.",
    },
  },
  global: {
    eyebrow: {
      en: "Global Error",
      ar: "خطأ عام",
    },
    title: {
      en: "Fazumi could not finish loading.",
      ar: "تعذر على Fazumi إكمال التحميل.",
    },
    body: {
      en: "Refresh and try again. If the issue keeps happening, it has already been reported.",
      ar: "حدّث الصفحة وحاول مرة أخرى. إذا استمرت المشكلة فقد تم الإبلاغ عنها بالفعل.",
    },
  },
  details: {
    en: "Technical details",
    ar: "التفاصيل التقنية",
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

function detectLocale(): ErrorLocale {
  if (typeof document === "undefined") {
    return "en";
  }

  const documentLocale = document.documentElement.lang;

  if (documentLocale === "ar") {
    return "ar";
  }

  if (typeof window !== "undefined") {
    const storedLocale =
      window.localStorage.getItem("fazumi_lang") ??
      document.cookie
        .split("; ")
        .find((entry) => entry.startsWith("fazumi_lang="))
        ?.split("=")[1];

    if (storedLocale === "ar") {
      return "ar";
    }
  }

  return "en";
}

export function StandaloneErrorScreen({
  error,
  onReset,
  scope,
}: StandaloneErrorScreenProps) {
  const [locale] = useState<ErrorLocale>(() => detectLocale());

  const isArabic = locale === "ar";
  const copy = useMemo(
    () => ({
      eyebrow: COPY[scope].eyebrow[locale],
      title: COPY[scope].title[locale],
      body: COPY[scope].body[locale],
      details: COPY.details[locale],
      retry: COPY.retry[locale],
      home: COPY.home[locale],
    }),
    [locale, scope]
  );

  return (
    <div
      lang={locale}
      dir={isArabic ? "rtl" : "ltr"}
      style={{
        minHeight: "100vh",
        margin: 0,
        background:
          "radial-gradient(circle at top left, rgba(36,112,82,0.18), transparent 28%), linear-gradient(180deg, #f7f4ee 0%, #f1ede6 100%)",
        color: "#193129",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <main
        style={{
          margin: "0 auto",
          display: "flex",
          minHeight: "100vh",
          maxWidth: "1180px",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 20px",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: "960px",
            overflow: "hidden",
            border: "1px solid rgba(36, 112, 82, 0.12)",
            borderRadius: "28px",
            backgroundColor: "rgba(255,255,255,0.92)",
            boxShadow: "0 24px 80px rgba(25, 49, 41, 0.12)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              alignItems: "center",
              padding: "28px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: "320px",
                  borderRadius: "24px",
                  background:
                    "linear-gradient(145deg, rgba(36,112,82,0.1), rgba(255,255,255,0.95))",
                  padding: "20px",
                }}
              >
                <Image
                  src="/brand/mascot/mascot-error.png"
                  alt={isArabic ? "تميمة Fazumi في حالة تنبيه" : "Fazumi mascot in an alert state"}
                  width={320}
                  height={320}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                  }}
                />
              </div>
            </div>

            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#247052",
                }}
              >
                {copy.eyebrow}
              </p>
              <h1
                style={{
                  margin: "14px 0 0",
                  fontSize: "clamp(2rem, 4vw, 3.15rem)",
                  lineHeight: 1.08,
                }}
              >
                {copy.title}
              </h1>
              <p
                style={{
                  margin: "16px 0 0",
                  maxWidth: "40ch",
                  fontSize: "16px",
                  lineHeight: 1.7,
                  color: "#64746d",
                }}
              >
                {copy.body}
              </p>

              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <button
                  type="button"
                  onClick={onReset}
                  style={{
                    appearance: "none",
                    border: "none",
                    borderRadius: "999px",
                    backgroundColor: "#247052",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                    padding: "14px 22px",
                  }}
                >
                  {copy.retry}
                </button>
                <button
                  type="button"
                  onClick={() => window.location.assign("/")}
                  style={{
                    appearance: "none",
                    borderRadius: "999px",
                    border: "1px solid #d9e2dc",
                    backgroundColor: "#ffffff",
                    color: "#247052",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                    padding: "14px 22px",
                  }}
                >
                  {copy.home}
                </button>
              </div>

              {error ? (
                <details
                  style={{
                    marginTop: "20px",
                    borderRadius: "18px",
                    border: "1px solid #e7ece7",
                    backgroundColor: "#f8faf8",
                    padding: "14px 16px",
                  }}
                >
                  <summary
                    style={{
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#64746d",
                    }}
                  >
                    {copy.details}
                  </summary>
                  <pre
                    style={{
                      margin: "12px 0 0",
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      color: "#c24d42",
                      fontSize: "12px",
                      lineHeight: 1.6,
                    }}
                  >
                    {error.message}
                  </pre>
                </details>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
