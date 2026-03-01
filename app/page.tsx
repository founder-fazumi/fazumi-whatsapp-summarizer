import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { CheckoutTeaser } from "@/components/landing/CheckoutTeaser";
import { FAQ } from "@/components/landing/FAQ";
import { Newsletter } from "@/components/landing/Newsletter";
import type { Profile } from "@/lib/supabase/types";

export default async function LandingPage() {
  // Server-side session check — active-plan users go straight to dashboard
  let isLoggedIn = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      isLoggedIn = true;
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, trial_expires_at")
        .eq("id", user.id)
        .single<Pick<Profile, "plan" | "trial_expires_at">>();

      const isActivePlan =
        ["monthly", "annual", "founder"].includes(profile?.plan ?? "") ||
        (!!profile?.trial_expires_at && new Date(profile.trial_expires_at) > new Date());

      if (isActivePlan) redirect("/dashboard");
    }
  } catch {
    // Supabase env vars not configured — show landing normally
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Nav isLoggedIn={isLoggedIn} />
      <main>
        <Hero />
        <SocialProof />
        <div id="how-it-works" className="scroll-mt-24">
          <HowItWorks />
        </div>
        <Testimonials />
        <div id="pricing" className="scroll-mt-24">
          <Pricing />
        </div>
        <CheckoutTeaser />
        <div id="faq" className="scroll-mt-24">
          <FAQ />
        </div>
        <Newsletter />
      </main>
    </div>
  );
}
