import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to the most common questions about Fazumi — privacy, Arabic support, billing, upload limits, and how school chat summaries work.",
  alternates: { canonical: "/faq" },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";
const TODAY = new Date().toISOString().split("T")[0] ?? "2026-03-07";

const faqWebPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "FAQ — Fazumi",
  url: `${APP_URL}/faq`,
  description:
    "Answers to the most common questions about Fazumi — privacy, Arabic support, billing, upload limits, and how school chat summaries work.",
  datePublished: "2026-02-27",
  dateModified: TODAY,
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
