import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/landing/Nav";
import { Pricing } from "@/components/landing/Pricing";

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Nav isLoggedIn={isLoggedIn} />
      <Pricing isLoggedIn={isLoggedIn} />
    </main>
  );
}
