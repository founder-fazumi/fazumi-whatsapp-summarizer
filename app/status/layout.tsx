import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Fazumi System Status — School Chat Summarizer" },
  description:
    "Current status of Fazumi services — web app, summarization API, authentication, and billing. Manual updates only.",
  openGraph: {
    title: "Fazumi System Status — School Chat Summarizer",
    description:
      "Current status of Fazumi services — web app, summarization API, authentication, and billing. Manual updates only.",
    url: "/status",
    type: "website",
  },
  alternates: {
    canonical: "/status",
    languages: { en: "/status", ar: "/status", "x-default": "/status" },
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";
const TODAY = new Date().toISOString().split("T")[0] ?? "2026-03-08";

const statusSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "System Status — Fazumi",
    url: `${APP_URL}/status`,
    description:
      "Current status of Fazumi services — web app, summarization API, authentication, and billing. Manual updates only.",
    datePublished: "2026-02-27",
    dateModified: TODAY,
    inLanguage: ["en", "ar"],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "System Status", item: `${APP_URL}/status` },
    ],
  },
];

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {statusSchemas.map((schema, i) => (
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
