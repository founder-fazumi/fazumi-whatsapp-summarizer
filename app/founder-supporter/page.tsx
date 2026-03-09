import type { Metadata } from "next";
import { FounderOfferPage } from "@/components/founder-offer/FounderOfferPage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: {
    absolute: "FAZUMI Founder Supporter | Early Access for Busy Parents",
  },
  description:
    "Join FAZUMI as one of 350 Founder Supporters. Turn messy school WhatsApp messages into clear summaries, tasks, dates, and payments.",
  alternates: {
    canonical: "/founder-supporter",
    languages: {
      en: "/founder-supporter",
      ar: "/founder-supporter",
      "x-default": "/founder-supporter",
    },
  },
  openGraph: {
    title: "FAZUMI Founder Supporter | Early Access for Busy Parents",
    description:
      "Join FAZUMI as one of 350 Founder Supporters. Turn messy school WhatsApp messages into clear summaries, tasks, dates, and payments.",
    url: "/founder-supporter",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FAZUMI Founder Supporter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FAZUMI Founder Supporter | Early Access for Busy Parents",
    description:
      "Join FAZUMI as one of 350 Founder Supporters. Turn messy school WhatsApp messages into clear summaries, tasks, dates, and payments.",
    images: ["/twitter-card.png"],
  },
};

export default async function FounderSupporterPage() {
  let isLoggedIn = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isLoggedIn = Boolean(user);
  } catch {
    // Supabase env vars may be unavailable in local review shells.
  }

  return <FounderOfferPage isLoggedIn={isLoggedIn} />;
}
