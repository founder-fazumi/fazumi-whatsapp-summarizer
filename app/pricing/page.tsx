import { createClient } from "@/lib/supabase/server";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { Nav } from "@/components/landing/Nav";
import { Pricing } from "@/components/landing/Pricing";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.com";

const pricingSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Fazumi Pro",
  image: `${APP_URL}/og-image.png`,
  brand: {
    "@type": "Brand",
    name: "Fazumi",
  },
  description:
    "School chat summarizer for parents. Paste WhatsApp, Telegram, or Facebook school group messages and get structured summaries with dates, tasks, and follow-ups.",
  url: `${APP_URL}/pricing`,
  offers: [
    {
      "@type": "Offer",
      name: "Monthly",
      price: "9.99",
      priceCurrency: "USD",
      priceValidUntil: "2027-01-01",
      availability: "https://schema.org/InStock",
      url: `${APP_URL}/pricing`,
    },
    {
      "@type": "Offer",
      name: "Annual",
      price: "99.99",
      priceCurrency: "USD",
      priceValidUntil: "2027-01-01",
      availability: "https://schema.org/InStock",
      url: `${APP_URL}/pricing`,
    },
    {
      "@type": "Offer",
      name: "Founder Plan",
      price: "149.00",
      priceCurrency: "USD",
      priceValidUntil: "2027-01-01",
      availability: "https://schema.org/LimitedAvailability",
      url: `${APP_URL}/pricing`,
    },
  ],
};

const pricingBreadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: APP_URL },
    { "@type": "ListItem", position: 2, name: "Pricing", item: `${APP_URL}/pricing` },
  ],
};

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingBreadcrumbSchema) }}
      />
      <Nav isLoggedIn={isLoggedIn} />
      <Pricing isLoggedIn={isLoggedIn} headingTag="h1" />
      <section className="bg-[var(--page-layer)] pb-[var(--page-section-space)] pt-0">
        <div className="page-shell">
          <FAQAccordion />
        </div>
      </section>
    </main>
  );
}
