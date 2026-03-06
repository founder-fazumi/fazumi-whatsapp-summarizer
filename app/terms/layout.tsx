import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Fazumi",
  description:
    "Read the Fazumi Terms of Service. By using Fazumi you agree to these terms governing your account, subscriptions, and use of the service.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
