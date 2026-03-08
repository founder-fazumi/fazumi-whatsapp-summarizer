import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & Support",
  description:
    "Practical guidance for getting started with Fazumi — uploads, privacy, language settings, billing, and troubleshooting common issues.",
  alternates: {
    canonical: "/help",
    languages: { en: "/help", ar: "/help", "x-default": "/help" },
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";
const TODAY = new Date().toISOString().split("T")[0] ?? "2026-03-08";

const helpSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Help & Support — Fazumi",
    url: `${APP_URL}/help`,
    description:
      "Practical guidance for getting started with Fazumi — uploads, privacy, language settings, billing, and troubleshooting common issues.",
    datePublished: "2026-02-27",
    dateModified: TODAY,
    inLanguage: ["en", "ar"],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "Help & Support", item: `${APP_URL}/help` },
    ],
  },
];

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {helpSchemas.map((schema, i) => (
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
