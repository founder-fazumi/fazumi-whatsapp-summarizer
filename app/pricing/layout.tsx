import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Fazumi",
  description:
    "Simple, transparent pricing for Fazumi. Start with a free 7-day trial. Upgrade to monthly or annual for unlimited school chat summaries.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
