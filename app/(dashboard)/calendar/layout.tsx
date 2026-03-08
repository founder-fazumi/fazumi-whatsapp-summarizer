import type { Metadata } from "next";
export const metadata: Metadata = { title: "Calendar", robots: { index: false, follow: false } };
export default function CalendarLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
