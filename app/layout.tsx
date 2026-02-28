import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Cairo } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/context/ThemeContext";
import { LangProvider } from "@/lib/context/LangContext";
import { Footer } from "@/components/landing/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Fazumi — WhatsApp Summary in Seconds",
  description:
    "Paste your WhatsApp school chat and get a clean summary: dates, action items, and questions — in seconds.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme/direction before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('fazumi_theme');if(t==='dark')document.documentElement.classList.add('dark');var l=localStorage.getItem('fazumi_lang')||'en';document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr';}catch(e){document.documentElement.lang='en';document.documentElement.dir='ltr';}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${cairo.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <LangProvider>
            {children}
            <Footer />
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
