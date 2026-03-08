import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Fazumi Terms of Service — School Chat Summarizer" },
  description:
    "Read the Fazumi Terms of Service. By using Fazumi you agree to these terms governing your account, subscriptions, and use of the service.",
  alternates: {
    canonical: "/terms",
    languages: { en: "/terms", ar: "/terms", "x-default": "/terms" },
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";
const TODAY = new Date().toISOString().split("T")[0] ?? "2026-03-08";

const termsSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms of Service — Fazumi",
    url: `${APP_URL}/terms`,
    description:
      "Read the Fazumi Terms of Service. By using Fazumi you agree to these terms governing your account, subscriptions, and use of the service.",
    datePublished: "2026-02-27",
    dateModified: TODAY,
    inLanguage: ["en", "ar"],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "Terms of Service", item: `${APP_URL}/terms` },
    ],
  },
];

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {termsSchemas.map((schema, i) => (
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
