import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How Fazumi uses cookies and similar technologies to keep your preferences and session secure.",
  alternates: {
    canonical: "/cookie-policy",
    languages: { en: "/cookie-policy", ar: "/cookie-policy", "x-default": "/cookie-policy" },
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";
const TODAY = new Date().toISOString().split("T")[0] ?? "2026-03-08";

const cookiePolicySchemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Cookie Policy — Fazumi",
    url: `${APP_URL}/cookie-policy`,
    description:
      "How Fazumi uses cookies and similar technologies to keep your preferences and session secure.",
    datePublished: "2026-02-27",
    dateModified: TODAY,
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
