import type { Metadata, Viewport } from "next";
import { Alexandria, Manrope } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { Footer } from "@/components/landing/Footer";
import type { Locale } from "@/lib/i18n";
import { LANG_STORAGE_KEY } from "@/lib/preferences";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
});

const alexandria = Alexandria({
  variable: "--font-alexandria",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "Fazumi — School Chat Summarizer for Parents",
    template: "%s — Fazumi",
  },
  description:
    "Turn WhatsApp, Telegram, and Facebook school chats into one action-ready family dashboard for dates, fees, forms, supplies, and reminders.",
  applicationName: "Fazumi",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app"
  ),
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      ar: "/",
      "x-default": "/",
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fazumi",
  },
  openGraph: {
    title: "Fazumi — Family Dashboard for School Chats",
    description:
      "Turn WhatsApp, Telegram, and Facebook school chats into one action-ready family dashboard without storing raw chat text.",
    url: "/",
    siteName: "Fazumi",
    type: "website",
    locale: "en_US",
    alternateLocale: "ar_AE",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fazumi social preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fazumi — Family Dashboard for School Chats",
    description:
      "Turn WhatsApp, Telegram, and Facebook school chats into one action-ready family dashboard without storing raw chat text.",
    images: ["/twitter-card.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#247052",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLocale: Locale =
    cookieStore.get(LANG_STORAGE_KEY)?.value === "en" ? "en" : "ar";
  const disableServiceWorkerBootstrap =
    process.env.NODE_ENV !== "production" ? "true" : "false";

  return (
    <html
      lang={initialLocale}
      dir={initialLocale === "ar" ? "rtl" : "ltr"}
      className={`${manrope.variable} ${alexandria.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <Script src="/hydration-sanitize.js" strategy="beforeInteractive" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Fazumi" />
        {/* Prevent flash of wrong theme/direction before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('fazumi_theme');if(t==='dark')document.documentElement.classList.add('dark');var m=document.cookie.match(/(?:^|; )${LANG_STORAGE_KEY}=([^;]+)/);var l=m?decodeURIComponent(m[1]):(localStorage.getItem('${LANG_STORAGE_KEY}')||'ar');document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr';document.cookie='${LANG_STORAGE_KEY}='+l+'; path=/; max-age=31536000; samesite=lax';var disableSw=${disableServiceWorkerBootstrap};if(disableSw&&'serviceWorker' in navigator){var cleanupKey='fazumi_sw_cleanup_v1';navigator.serviceWorker.getRegistrations().then(function(registrations){return Promise.all(registrations.map(function(registration){return registration.unregister().catch(function(){return false;});}));}).then(function(unregisterResults){var unregistered=unregisterResults.some(Boolean);if(!('caches' in window)){return unregistered;}return caches.keys().then(function(keys){var fazumiKeys=keys.filter(function(key){return key.indexOf('fazumi-')===0;});if(fazumiKeys.length===0){return unregistered;}return Promise.all(fazumiKeys.map(function(key){return caches.delete(key);})).then(function(deleteResults){return unregistered||deleteResults.some(Boolean);});});}).then(function(changed){if(changed&&!sessionStorage.getItem(cleanupKey)){sessionStorage.setItem(cleanupKey,'1');window.location.reload();}else if(!changed){sessionStorage.removeItem(cleanupKey);}}).catch(function(){});}}catch(e){document.documentElement.lang='ar';document.documentElement.dir='rtl';}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <AppProviders initialLocale={initialLocale}>
          {children}
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
