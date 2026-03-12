import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Fazumi Cookie Policy — Privacy-First School App" },
  description:
    "How Fazumi uses cookies and similar technologies to keep your preferences and session secure.",
  openGraph: {
    title: "Fazumi Cookie Policy — Privacy-First School App",
    description:
      "How Fazumi uses cookies and similar technologies to keep your preferences and session secure.",
    url: "/cookie-policy",
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
    canonical: "/cookie-policy",
    languages: { en: "/cookie-policy", ar: "/cookie-policy", "x-default": "/cookie-policy" },
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.com";

const cookiePolicySchemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Cookie Policy — Fazumi",
    url: `${APP_URL}/cookie-policy`,
    description:
      "How Fazumi uses cookies and similar technologies to keep your preferences and session secure.",
    datePublished: "2026-02-27",
    dateModified: "2026-02-27",
    inLanguage: ["en", "ar"],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "Cookie Policy", item: `${APP_URL}/cookie-policy` },
    ],
  },
];

export default function CookiePolicyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {cookiePolicySchemas.map((schema, i) => (
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
