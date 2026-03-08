import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "WhatsApp School Chat Summarizer FAQ — Fazumi" },
  description:
    "Answers to the most common questions about Fazumi — privacy, Arabic support, billing, upload limits, and how school chat summaries work.",
  openGraph: {
    title: "WhatsApp School Chat Summarizer FAQ — Fazumi",
    description:
      "Answers to the most common questions about Fazumi — privacy, Arabic support, billing, upload limits, and how school chat summaries work.",
    url: "/faq",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fazumi — School Chat Summarizer",
      },
    ],
  },
  alternates: {
    canonical: "/faq",
    languages: { en: "/faq", ar: "/faq", "x-default": "/faq" },
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";

const faqWebPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "FAQ — Fazumi",
  url: `${APP_URL}/faq`,
  description:
    "Answers to the most common questions about Fazumi — privacy, Arabic support, billing, upload limits, and how school chat summaries work.",
  datePublished: "2026-02-27",
  dateModified: "2026-03-07",
  inLanguage: ["en", "ar"],
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqWebPageSchema) }}
      />
      {children}
    </>
  );
}
