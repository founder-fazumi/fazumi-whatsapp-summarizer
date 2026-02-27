"use client";

import { useState } from "react";
import { AccordionItem } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "privacy",
    label: "Privacy",
    items: [
      {
        question: "Is my chat data private?",
        answer:
          "Absolutely. Fazumi never stores your raw chat messages. Only the structured summary (dates, action items, etc.) is saved — and only if you're logged in. For anonymous visitors, nothing is stored at all. Your raw text is processed in memory and immediately discarded after the summary is generated.",
      },
      {
        question: "Is Fazumi affiliated with my child's school?",
        answer:
          "No. Fazumi is an independent tool built for parents. We are not affiliated with, endorsed by, or connected to any school, ministry of education, or government body. We simply help you make sense of your school group chats.",
      },
      {
        question: "Who can see my summaries?",
        answer:
          "Only you. Summaries are private to your account. We do not share, sell, or analyze your summaries for advertising purposes.",
      },
    ],
  },
  {
    id: "language",
    label: "Languages",
    items: [
      {
        question: "What languages are supported?",
        answer:
          "Fazumi supports English and Arabic. You can let it auto-detect the language of your chat, or force English or Arabic output using the language toggle. Arabic output is fully RTL (right-to-left) with proper Arabic font rendering.",
      },
      {
        question: "Does it work with mixed English/Arabic chats?",
        answer:
          'Yes. Many GCC school groups mix Arabic and English in the same conversation. Fazumi handles this gracefully — when set to "Auto", it detects the dominant language. You can always override the output language manually.',
      },
    ],
  },
  {
    id: "upload",
    label: "Uploads",
    items: [
      {
        question: "How does file upload work?",
        answer:
          'WhatsApp lets you export a group chat as a .zip file (containing a _chat.txt and media files). In Fazumi, you upload that .zip and we automatically extract the text file and ignore all media (photos, videos, voice notes). Only the text is processed — media files are never read.',
      },
      {
        question: "What file types are supported?",
        answer:
          "We support .txt files (plain text) and .zip files (WhatsApp export format). File size limit is 10 MB. If your export is larger, you can trim the chat to the last 7–14 days before exporting.",
      },
      {
        question: "Is there a message limit?",
        answer:
          "The paste box accepts up to 30,000 characters (~400-600 messages). For longer chats, export and trim to a recent time window. The AI model performs best on focused, recent conversations anyway.",
      },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    items: [
      {
        question: "Can I get a refund?",
        answer:
          "Monthly and annual plans come with a 14-day money-back guarantee. If you're not happy for any reason, contact us within 14 days of your purchase and we'll refund you in full. The Founder plan is a final sale with no refunds — it's a one-time lifetime deal.",
      },
      {
        question: "What happens after the free trial?",
        answer:
          "After your 7-day trial, your account switches to 3 lifetime free summaries. When those are used, you'll need to upgrade to continue. Your previous summaries are always accessible regardless of plan.",
      },
      {
        question: "What is the Founder plan?",
        answer:
          "The Founder plan is a one-time $149 lifetime access deal, limited to 200 seats. It includes unlimited summaries forever, one year of future top-tier features (as they launch), a Founding Supporter badge, and access to our private parent community on Discord. No refunds — final sale.",
      },
    ],
  },
];

export function FAQ() {
  const [activeTab, setActiveTab] = useState("privacy");
  const current = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <section id="faq" className="py-16 bg-[var(--bg-2)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)] mb-2">FAQ</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
            Frequently asked questions
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Everything parents ask before signing up.
          </p>
        </div>

        {/* Tab pills */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors border",
                activeTab === tab.id
                  ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Accordion items */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] px-5 shadow-[var(--shadow-card)]">
          {current.items.map((item) => (
            <AccordionItem
              key={item.question}
              question={item.question}
              answer={item.answer}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
