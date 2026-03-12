import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Contact Fazumi — School Chat Summarizer Support" },
  description:
    "Get in touch with the Fazumi team. Send feedback, report an issue, or ask a question — we read every message.",
  openGraph: {
    title: "Contact Fazumi — School Chat Summarizer Support",
    description:
      "Get in touch with the Fazumi team. Send feedback, report an issue, or ask a question — we read every message.",
    url: "/contact",
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
    canonical: "/contact",
    languages: { en: "/contact", ar: "/contact", "x-default": "/contact" },
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.com";

const contactSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Contact — Fazumi",
    url: `${APP_URL}/contact`,
    description:
      "Get in touch with the Fazumi team. Send feedback, report an issue, or ask a question — we read every message.",
    datePublished: "2026-02-27",
    dateModified: "2026-03-07",
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
