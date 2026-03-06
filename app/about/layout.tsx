import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Fazumi",
  description:
    "Learn how Fazumi was built to help parents and students cut through noisy school WhatsApp groups and never miss an important update.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
