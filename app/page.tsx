import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import type { Profile } from "@/lib/supabase/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Fazumi",
  url: APP_URL,
  logo: `${APP_URL}/brand/logo-mark.png`,
  description:
    "Fazumi turns WhatsApp, Telegram, and Facebook school chats into one action-ready family dashboard for dates, forms, fees, and reminders without storing raw chat text.",
  sameAs: ["https://x.com/FazumiApp", "https://instagram.com/fazumi.app"],
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
      name: "Which school chat apps does Fazumi support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Fazumi supports pasted or uploaded school chat text from WhatsApp, Telegram, and Facebook Messenger. WhatsApp ZIP exports also support incremental uploads.",
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
        text: "Open the billing page after signing in and use the Lemon Squeezy customer portal to cancel. Your paid access stays active until the current billing period ends.",
      },
    },
  ],
};

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
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
