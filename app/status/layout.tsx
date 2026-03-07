import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Status",
  description:
    "Current status of Fazumi services — web app, summarization API, authentication, and billing. Manual updates only.",
  alternates: { canonical: "/status" },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";
const TODAY = new Date().toISOString().split("T")[0] ?? "2026-03-07";

const statusWebPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "System Status — Fazumi",
  url: `${APP_URL}/status`,
  description:
    "Current status of Fazumi services — web app, summarization API, authentication, and billing. Manual updates only.",
  datePublished: "2026-02-27",
  dateModified: TODAY,
  inLanguage: ["en", "ar"],
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(statusWebPageSchema) }}
      />
      {children}
    </>
  );
}
