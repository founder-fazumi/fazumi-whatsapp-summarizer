import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "School WhatsApp Summarizer for Parents — About Fazumi" },
  description:
    "Learn how Fazumi was built to help parents and students cut through noisy school WhatsApp groups and never miss an important update.",
  openGraph: {
    title: "School WhatsApp Summarizer for Parents — About Fazumi",
    description:
      "Learn how Fazumi was built to help parents cut through noisy school WhatsApp groups and never miss an important update.",
    url: "/about",
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
    canonical: "/about",
    languages: { en: "/about", ar: "/about", "x-default": "/about" },
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
