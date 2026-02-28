import { Nav } from "@/components/landing/Nav";
import { Pricing } from "@/components/landing/Pricing";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Nav />
      <Pricing />
    </main>
  );
}
