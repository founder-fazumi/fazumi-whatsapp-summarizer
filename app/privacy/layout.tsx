import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Fazumi Privacy Policy — No Raw Chat Data Stored" },
  description:
    "Fazumi never stores your raw chat text. Read our Privacy Policy to understand exactly what data we collect and how we protect it.",
  openGraph: {
    title: "Fazumi Privacy Policy — No Raw Chat Data Stored",
    description:
      "Fazumi never stores your raw chat text. Read our Privacy Policy to understand exactly what data we collect and how we protect it.",
    url: "/privacy",
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
    canonical: "/privacy",
    languages: { en: "/privacy", ar: "/privacy", "x-default": "/privacy" },
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";

const privacySchemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privacy Policy — Fazumi",
    url: `${APP_URL}/privacy`,
    description:
      "Fazumi never stores your raw chat text. Read our Privacy Policy to understand exactly what data we collect and how we protect it.",
    datePublished: "2026-02-27",
    dateModified: "2026-02-27",
    inLanguage: ["en", "ar"],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "Privacy Policy", item: `${APP_URL}/privacy` },
    ],
  },
];

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {privacySchemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {children}
    </>
  );
}
