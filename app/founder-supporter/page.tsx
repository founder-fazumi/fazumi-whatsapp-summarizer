import type { Metadata } from "next";
import { FounderOfferPage } from "@/components/founder-offer/FounderOfferPage";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "FAZUMI Founder Supporter | Early Support for Busy Parents",
  },
  description:
    "Optional early-supporter plan for up to 200 busy parents who want calmer school-message summaries, founder perks, and early product access.",
  alternates: {
    canonical: "/founder-supporter",
    languages: {
      en: "/founder-supporter",
      ar: "/founder-supporter",
      "x-default": "/founder-supporter",
    },
  },
  openGraph: {
    title: "FAZUMI Founder Supporter | Early Support for Busy Parents",
    description:
      "Optional early-supporter plan for up to 200 busy parents who want calmer school-message summaries, founder perks, and early product access.",
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
    title: "FAZUMI Founder Supporter | Early Support for Busy Parents",
    description:
      "Optional early-supporter plan for up to 200 busy parents who want calmer school-message summaries, founder perks, and early product access.",
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
