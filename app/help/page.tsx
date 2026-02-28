import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion } from "@/components/ui/accordion";
import { HelpCircle, Mail } from "lucide-react";

const FAQS = [
  {
    q: "How does Fazumi work?",
    a: "Paste your WhatsApp group chat export into the text box, click Summarize, and Fazumi extracts key dates, tasks, people, and questions — using AI — in seconds.",
  },
  {
    q: "Is my chat text stored?",
    a: "No. Your raw chat text is processed in memory and immediately discarded. Only the structured summary output is saved to your account.",
  },
  {
    q: "What languages are supported?",
    a: "Fazumi auto-detects Arabic and English and outputs summaries in the same language. You can also pin a preferred output language in Settings.",
  },
  {
    q: "How many summaries do I get on the free plan?",
    a: "You get a 7-day free trial with unlimited summaries. After the trial, 3 lifetime summaries are available without a subscription.",
  },
  {
    q: "Can I summarize a ZIP file?",
    a: "Yes. Export your WhatsApp chat as a ZIP, upload it here, and Fazumi extracts the text content automatically (media files are ignored).",
  },
  {
    q: "How do I cancel my subscription?",
    a: "You can cancel anytime from the Billing page. You keep access until the end of your billing period.",
  },
];

export default function HelpPage() {
  return (
    <DashboardShell>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <HelpCircle className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <CardTitle>Help & FAQ</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion
              items={FAQS.map((faq) => ({ question: faq.q, answer: faq.a }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <Mail className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Still need help?</p>
                <a
                  href="mailto:support@fazumi.app"
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  support@fazumi.app
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
