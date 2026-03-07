import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to the most common questions about Fazumi — privacy, Arabic support, billing, upload limits, and how school chat summaries work.",
  alternates: { canonical: "/faq" },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
