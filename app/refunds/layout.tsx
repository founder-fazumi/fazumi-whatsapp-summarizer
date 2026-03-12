import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Fazumi Refund Policy — 14-Day Initial Purchase Refunds" },
  description:
    "Fazumi's refund and cancellation policy for paid plans. Refund requests may be made within 14 days of the initial purchase, and cancellations stop future renewals.",
  openGraph: {
    title: "Fazumi Refund Policy — 14-Day Initial Purchase Refunds",
    description:
      "Fazumi's refund and cancellation policy for paid plans. Refund requests may be made within 14 days of the initial purchase, and cancellations stop future renewals.",
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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.com";

const refundsSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Refund Policy — Fazumi",
    url: `${APP_URL}/refunds`,
    description:
      "Fazumi's refund and cancellation policy for paid plans. Refund requests may be made within 14 days of the initial purchase, and cancellations stop future renewals.",
    datePublished: "2026-02-27",
    dateModified: "2026-03-13",
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
