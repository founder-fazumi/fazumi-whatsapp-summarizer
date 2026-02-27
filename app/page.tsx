import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { Compare } from "@/components/landing/Compare";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { CheckoutTeaser } from "@/components/landing/CheckoutTeaser";
import { FAQ } from "@/components/landing/FAQ";
import { Newsletter } from "@/components/landing/Newsletter";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Nav />
      <main>
        <Hero />
        <SocialProof />
        <Compare />
        <HowItWorks />
        <Testimonials />
        <section id="pricing">
          <Pricing />
        </section>
        <CheckoutTeaser />
        <FAQ />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
}
