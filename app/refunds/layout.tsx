import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Fazumi's refund and cancellation policy for monthly, annual, and Founder plans. 7-day money-back on monthly and annual.",
  alternates: { canonical: "/refunds" },
};

export default function RefundsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
