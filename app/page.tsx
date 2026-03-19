import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { resolveEntitlement, type EntitlementSubscription } from "@/lib/limits";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.com";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${APP_URL}/#organization`,
  name: "Fazumi",
  url: APP_URL,
  logo: `${APP_URL}/brand/logo/fazumi-logo-256.png`,
  description:
    "Fazumi turns WhatsApp, Telegram, and Facebook school chats into one action-ready family dashboard for dates, forms, fees, and reminders without storing raw chat text.",
  sameAs: [
    "https://www.instagram.com/fazumi.app",
    "https://x.com/FazumiApp",
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does Fazumi work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Paste your school WhatsApp chat or upload the export. Fazumi reads the conversation, extracts dates, tasks, announcements, links, and follow-up questions, then saves the clean summary to your history.",
      },
    },
    {
      "@type": "Question",
      name: "Is my chat data private?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Fazumi does not store your raw chat messages in the database. Only the generated summary and structured items are saved to your account history.",
      },
    },
    {
      "@type": "Question",
      name: "How many free summaries do I get?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Every new account starts with a 7-day free trial that includes 3 summaries per day. After the trial ends, you keep 3 lifetime free summaries unless you upgrade.",
      },
    },
    {
      "@type": "Question",
      name: "Can I share summaries with my spouse?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You can export a summary as a plain-text file and share it via WhatsApp, Telegram, or any messaging app. Family sharing features are on the roadmap.",
      },
    },
    {
      "@type": "Question",
      name: "Does it work with Arabic chats?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Fazumi supports Arabic and English chats, including mixed-language school groups. You can choose Auto, English, or Arabic output before summarizing.",
      },
    },
    {
      "@type": "Question",
      name: "What if I exceed my limit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your saved summaries stay available. To create more summaries, wait for the next daily reset if you are in trial, or upgrade to Pro for higher daily limits.",
      },
    },
    {
      "@type": "Question",
      name: "How do I cancel my subscription?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Open the billing page after signing in and use the billing portal linked there to manage or cancel your subscription. Cancellation stops future renewals.",
      },
    },
    {
      "@type": "Question",
      name: "What is the refund policy for paid plans?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can request a refund within 14 days of the initial purchase date for a paid Fazumi plan. The payment partner shown at checkout handles the final billing workflow.",
      },
    },
  ],
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${APP_URL}/#software`,
  name: "Fazumi",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "9.99",
    priceCurrency: "USD",
    priceValidUntil: "2027-01-01",
  },
  description:
    "Turn WhatsApp, Telegram, and Facebook school chats into structured summaries with dates, action items, and follow-up questions.",
  url: APP_URL,
  inLanguage: ["en", "ar"],
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${APP_URL}/#website`,
  name: "Fazumi",
  url: APP_URL,
};

const homeWebPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${APP_URL}/#webpage`,
  name: "Fazumi — School Chat Summarizer for Parents",
  url: APP_URL,
  description:
    "Turn WhatsApp, Telegram, and Facebook school chats into one action-ready family dashboard for dates, fees, forms, supplies, and reminders.",
  datePublished: "2026-02-27",
  dateModified: "2026-03-07",
  inLanguage: ["en", "ar"],
  isPartOf: { "@id": `${APP_URL}/#website` },
  about: { "@id": `${APP_URL}/#software` },
  publisher: { "@id": `${APP_URL}/#organization` },
};

export default async function LandingPage() {
  // Server-side session check — users with an active paid entitlement or trial go straight to the app
  let isLoggedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isLoggedIn = true;
      const [{ data: profile }, { data: subscriptions }] = await Promise.all([
        supabase
          .from("profiles")
          .select("plan, trial_expires_at")
          .eq("id", user.id)
          .maybeSingle<{ plan: string | null; trial_expires_at: string | null }>(),
        supabase
          .from("subscriptions")
          .select("plan_type, status, current_period_end, updated_at, created_at")
          .eq("user_id", user.id),
      ]);

      const entitlement = resolveEntitlement({
        profile: {
          plan: profile?.plan ?? "free",
          trial_expires_at: profile?.trial_expires_at ?? null,
        },
        subscriptions: (subscriptions ?? []) as EntitlementSubscription[],
      });

      if (entitlement.hasPaidAccess || entitlement.isTrialActive) {
        redirect("/dashboard");
      }
    }
  } catch {
    // Supabase env vars not configured — show landing normally
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeWebPageSchema) }}
      />
      <Nav isLoggedIn={isLoggedIn} />
      <main>
        <Hero />
        <div id="how-it-works" className="scroll-mt-24">
          <HowItWorks />
        </div>
        <div id="pricing" className="scroll-mt-24">
          <Pricing />
        </div>
        <div id="faq" className="scroll-mt-24 bg-[var(--page-layer)] py-[var(--page-section-space)]">
          <div className="page-shell">
            <FAQAccordion />
          </div>
        </div>
      </main>
    </div>
  );
}
