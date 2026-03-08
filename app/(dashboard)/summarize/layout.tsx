import type { Metadata } from "next";
export const metadata: Metadata = { title: "Summarize", robots: { index: false, follow: false } };
export default function SummarizeLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
