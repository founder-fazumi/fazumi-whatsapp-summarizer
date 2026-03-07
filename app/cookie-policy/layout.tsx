import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How Fazumi uses cookies and similar technologies to keep your preferences and session secure.",
  alternates: { canonical: "/cookie-policy" },
};

export default function CookiePolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
