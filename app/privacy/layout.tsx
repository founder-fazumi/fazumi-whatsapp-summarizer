import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Fazumi",
  description:
    "Fazumi never stores your raw chat text. Read our Privacy Policy to understand exactly what data we collect and how we protect it.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
