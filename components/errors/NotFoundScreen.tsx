"use client";

import Link from "next/link";
import { LEGAL_CONTACT_EMAIL } from "@/lib/config/legal";
import type { Locale } from "@/lib/i18n";

const PAGE_BG =
  "radial-gradient(circle at top left, rgba(36, 112, 82, 0.08), transparent 28%), linear-gradient(180deg, #f6f2ea 0%, #fbf9f5 100%)";
const CARD_BG = "rgba(255, 253, 249, 0.96)";
const CARD_BORDER = "#d8e1db";
const TEXT = "#193129";
const MUTED = "#5f6f68";
const PRIMARY = "#247052";

const COPY = {
  en: {
    eyebrow: "404",
    label: "FAZUMI",
    title: "Page not found",
    body: "The page you're looking for doesn't exist.",
    home: "Go home",
    support: "Contact support",
    supportHint: "If you need the right link, email",
  },
  ar: {
    eyebrow: "404",
    label: "فازومي",
    title: "الصفحة غير موجودة",
    body: "الصفحة التي تبحث عنها غير متاحة.",
    home: "العودة للرئيسية",
    support: "تواصل مع الدعم",
    supportHint: "إذا كنت تحتاج إلى الرابط الصحيح، فراسل",
  },
} as const;

export function NotFoundScreen({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const isArabic = locale === "ar";

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      lang={locale}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: PAGE_BG,
        color: TEXT,
        fontFamily: isArabic ? "Tahoma, Arial, sans-serif" : "\"Segoe UI\", system-ui, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "42rem",
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: "1.5rem",
          background: CARD_BG,
          padding: "clamp(1.5rem, 3vw, 2.5rem)",
          boxShadow: "0 18px 40px rgba(18, 35, 27, 0.08)",
          textAlign: isArabic ? "right" : "left",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isArabic ? "flex-end" : "flex-start",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "999px",
              border: `1px solid ${CARD_BORDER}`,
              padding: "0.4rem 0.75rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: PRIMARY,
              background: "rgba(255, 255, 255, 0.9)",
            }}
          >
            {copy.eyebrow}
          </span>
          <span
            style={{
              fontSize: "0.82rem",
              fontWeight: 700,
              letterSpacing: isArabic ? "normal" : "0.14em",
              textTransform: isArabic ? "none" : "uppercase",
              color: MUTED,
            }}
          >
            {copy.label}
          </span>
        </div>

        <h1
          style={{
            margin: "1rem 0 0",
            fontSize: "clamp(2rem, 4vw, 3rem)",
            lineHeight: 1.05,
            fontWeight: 700,
          }}
        >
          {copy.title}
        </h1>
        <p
          style={{
            margin: "0.9rem 0 0",
            maxWidth: "32rem",
            color: MUTED,
            fontSize: "1rem",
            lineHeight: 1.7,
          }}
        >
          {copy.body}
        </p>

        <div
          style={{
            marginTop: "1.75rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: isArabic ? "flex-end" : "flex-start",
          }}
        >
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "2.9rem",
              padding: "0 1.1rem",
              borderRadius: "0.95rem",
              textDecoration: "none",
              fontWeight: 600,
              color: "#ffffff",
              background: PRIMARY,
              transition: "background-color 160ms ease",
            }}
          >
            {copy.home}
          </Link>

          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "2.9rem",
              padding: "0 1.1rem",
              borderRadius: "0.95rem",
              textDecoration: "none",
              fontWeight: 600,
              color: TEXT,
              background: "#ffffff",
              border: `1px solid ${CARD_BORDER}`,
            }}
          >
            {copy.support}
          </a>
        </div>

        <p
          style={{
            margin: "1rem 0 0",
            color: MUTED,
            fontSize: "0.95rem",
            lineHeight: 1.7,
          }}
        >
          {copy.supportHint}{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            dir="ltr"
            style={{
              color: PRIMARY,
              textDecoration: "underline",
              fontWeight: 600,
            }}
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </main>
  );
}
