import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Founding Supporters — Fazumi",
  robots: { index: false, follow: false },
};

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
