import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Fazumi Privacy Policy — No Raw Chat Data Stored" },
  description:
    "Fazumi never stores your raw chat text. Read our Privacy Policy to understand exactly what data we collect and how we protect it.",
  alternates: {
    canonical: "/privacy",
    languages: { en: "/privacy", ar: "/privacy", "x-default": "/privacy" },
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";
const TODAY = new Date().toISOString().split("T")[0] ?? "2026-03-08";

const privacySchemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privacy Policy — Fazumi",
    url: `${APP_URL}/privacy`,
    description:
      "Fazumi never stores your raw chat text. Read our Privacy Policy to understand exactly what data we collect and how we protect it.",
    datePublished: "2026-02-27",
    dateModified: TODAY,
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
