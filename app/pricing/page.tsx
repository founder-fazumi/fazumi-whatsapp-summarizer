import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/landing/Nav";
import { Pricing } from "@/components/landing/Pricing";

export default async function PricingPage() {
  let isLoggedIn = false;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  } catch {
    // Supabase env vars not configured — render pricing normally.
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Nav isLoggedIn={isLoggedIn} />
      <Pricing isLoggedIn={isLoggedIn} />
    </main>
  );
}
