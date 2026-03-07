import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Status",
  description:
    "Current availability of Fazumi services including the summarizer, authentication, and billing.",
  alternates: { canonical: "/status" },
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
