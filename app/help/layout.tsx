import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center",
  description:
    "Find answers to common questions about using Fazumi to summarize school WhatsApp, Telegram, and Facebook group chats.",
  alternates: { canonical: "/help" },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
