import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & Support",
  description:
    "Practical guidance for getting started with Fazumi — uploads, privacy, language settings, billing, and troubleshooting common issues.",
  alternates: { canonical: "/help" },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";
const TODAY = new Date().toISOString().split("T")[0] ?? "2026-03-07";

const helpWebPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Help & Support — Fazumi",
  url: `${APP_URL}/help`,
  description:
    "Practical guidance for getting started with Fazumi — uploads, privacy, language settings, billing, and troubleshooting common issues.",
  datePublished: "2026-02-27",
  dateModified: TODAY,
  inLanguage: ["en", "ar"],
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(helpWebPageSchema) }}
      />
      {children}
    </>
  );
}
