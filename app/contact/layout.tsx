import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Fazumi team. Send feedback, report an issue, or ask a question — we read every message.",
  alternates: {
    canonical: "/contact",
    languages: { en: "/contact", ar: "/contact", "x-default": "/contact" },
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";
const TODAY = new Date().toISOString().split("T")[0] ?? "2026-03-08";

const contactSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Contact — Fazumi",
    url: `${APP_URL}/contact`,
    description:
      "Get in touch with the Fazumi team. Send feedback, report an issue, or ask a question — we read every message.",
    datePublished: "2026-02-27",
    dateModified: TODAY,
    inLanguage: ["en", "ar"],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "Contact", item: `${APP_URL}/contact` },
    ],
  },
];

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {contactSchemas.map((schema, i) => (
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
