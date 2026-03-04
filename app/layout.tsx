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
  title: "Fazumi — WhatsApp Summary in Seconds",
  description:
    "Paste your WhatsApp school chat and get a clean summary: dates, action items, and questions — in seconds.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fazumi",
  },
  openGraph: {
    images: [{ url: "/og-image.svg", width: 1200, height: 630 }],
  },
  icons: {
    icon: "/apple-touch-icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#247052",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLocale: Locale =
    cookieStore.get(LANG_STORAGE_KEY)?.value === "ar" ? "ar" : "en";
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Fazumi" />
        {/* Prevent flash of wrong theme/direction before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('fazumi_theme');if(t==='dark')document.documentElement.classList.add('dark');var m=document.cookie.match(/(?:^|; )${LANG_STORAGE_KEY}=([^;]+)/);var l=m?decodeURIComponent(m[1]):(localStorage.getItem('${LANG_STORAGE_KEY}')||'en');document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr';document.cookie='${LANG_STORAGE_KEY}='+l+'; path=/; max-age=31536000; samesite=lax';var disableSw=${disableServiceWorkerBootstrap};if(disableSw&&'serviceWorker' in navigator){var cleanupKey='fazumi_sw_cleanup_v1';navigator.serviceWorker.getRegistrations().then(function(registrations){return Promise.all(registrations.map(function(registration){return registration.unregister().catch(function(){return false;});}));}).then(function(unregisterResults){var unregistered=unregisterResults.some(Boolean);if(!('caches' in window)){return unregistered;}return caches.keys().then(function(keys){var fazumiKeys=keys.filter(function(key){return key.indexOf('fazumi-')===0;});if(fazumiKeys.length===0){return unregistered;}return Promise.all(fazumiKeys.map(function(key){return caches.delete(key);})).then(function(deleteResults){return unregistered||deleteResults.some(Boolean);});});}).then(function(changed){if(changed&&!sessionStorage.getItem(cleanupKey)){sessionStorage.setItem(cleanupKey,'1');window.location.reload();}else if(!changed){sessionStorage.removeItem(cleanupKey);}}).catch(function(){});}}catch(e){document.documentElement.lang='en';document.documentElement.dir='ltr';}})();`,
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
