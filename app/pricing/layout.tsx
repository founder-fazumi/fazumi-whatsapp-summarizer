import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Fazumi Pricing — School Chat Summarizer Plans" },
  description:
    "Simple, transparent pricing for Fazumi. Start with a free 7-day trial. Upgrade to monthly or annual for unlimited school chat summaries.",
  openGraph: {
    title: "Fazumi Pricing — School Chat Summarizer Plans",
    description:
      "Simple, transparent pricing for Fazumi. Start with a free 7-day trial. Upgrade to monthly or annual for unlimited school chat summaries.",
    url: "/pricing",
    type: "website",
  },
  alternates: {
    canonical: "/pricing",
    languages: { en: "/pricing", ar: "/pricing", "x-default": "/pricing" },
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
