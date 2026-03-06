import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Fazumi",
  description:
    "Get in touch with the Fazumi team. Send feedback, report an issue, or ask a question — we read every message.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
