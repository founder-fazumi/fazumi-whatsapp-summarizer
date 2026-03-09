import type { Metadata } from "next";
import { FounderSupportPage } from "@/components/founder-support/FounderSupportPage";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Where Your Support Goes | Fazumi Founder Support",
  },
  description:
    "A founder note about how early FAZUMI support helps fund better tools, stronger systems, and more careful product building.",
  alternates: {
    canonical: "/founder-support",
    languages: {
      en: "/founder-support",
      ar: "/founder-support",
      "x-default": "/founder-support",
    },
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function FounderSupportTransparencyPage() {
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

  return <FounderSupportPage isLoggedIn={isLoggedIn} />;
}
