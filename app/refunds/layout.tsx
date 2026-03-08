import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Fazumi Refund Policy — 7-Day Money-Back Guarantee" },
  description:
    "Fazumi's refund and cancellation policy for monthly, annual, and Founder plans. 7-day money-back on monthly and annual.",
  openGraph: {
    title: "Fazumi Refund Policy — 7-Day Money-Back Guarantee",
    description:
      "Fazumi's refund and cancellation policy for monthly, annual, and Founder plans. 7-day money-back on monthly and annual.",
    url: "/refunds",
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
    canonical: "/refunds",
    languages: { en: "/refunds", ar: "/refunds", "x-default": "/refunds" },
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";

const refundsSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Refund Policy — Fazumi",
    url: `${APP_URL}/refunds`,
    description:
      "Fazumi's refund and cancellation policy for monthly, annual, and Founder plans. 7-day money-back on monthly and annual.",
    datePublished: "2026-02-27",
    dateModified: "2026-02-27",
    inLanguage: ["en", "ar"],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "Refund Policy", item: `${APP_URL}/refunds` },
    ],
  },
];

export default function RefundsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {refundsSchemas.map((schema, i) => (
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
