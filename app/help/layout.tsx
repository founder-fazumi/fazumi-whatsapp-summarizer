import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Help & Support — Fazumi School Chat Summarizer" },
  description:
    "Practical guidance for getting started with Fazumi — uploads, privacy, language settings, billing, and troubleshooting common issues.",
  openGraph: {
    title: "Help & Support — Fazumi School Chat Summarizer",
    description:
      "Practical guidance for getting started with Fazumi — uploads, privacy, language settings, billing, and troubleshooting common issues.",
    url: "/help",
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
    canonical: "/help",
    languages: { en: "/help", ar: "/help", "x-default": "/help" },
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.com";

const helpSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Help & Support — Fazumi",
    url: `${APP_URL}/help`,
    description:
      "Practical guidance for getting started with Fazumi — uploads, privacy, language settings, billing, and troubleshooting common issues.",
    datePublished: "2026-02-27",
    dateModified: "2026-03-07",
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
