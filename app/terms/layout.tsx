import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Fazumi Terms of Service — School Chat Summarizer" },
  description:
    "Read the Fazumi Terms of Service. By using Fazumi you agree to these terms governing your account, subscriptions, and use of the service.",
  openGraph: {
    title: "Fazumi Terms of Service — School Chat Summarizer",
    description:
      "Read the Fazumi Terms of Service. By using Fazumi you agree to these terms governing your account, subscriptions, and use of the service.",
    url: "/terms",
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
    canonical: "/terms",
    languages: { en: "/terms", ar: "/terms", "x-default": "/terms" },
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.com";

const termsSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms of Service — Fazumi",
    url: `${APP_URL}/terms`,
    description:
      "Read the Fazumi Terms of Service. By using Fazumi you agree to these terms governing your account, subscriptions, and use of the service.",
    datePublished: "2026-02-27",
    dateModified: "2026-02-27",
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
