"use client";

import { useState } from "react";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Simulate submit — replace with real API call
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <section className="py-16 bg-[var(--bg-2)]">
      <div className="mx-auto max-w-xl px-4 sm:px-6 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10 mb-4">
          <Mail className="h-5 w-5 text-[var(--primary)]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-2">
          Stay in the loop
        </h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-8">
          Get notified when we launch new features like calendar sync, Arabic
          voice notes, and team accounts. No spam — unsubscribe any time.
        </p>

        {submitted ? (
          <div className="flex items-center justify-center gap-2 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] py-5 px-6 shadow-[var(--shadow-card)]">
            <CheckCircle2 className="h-5 w-5 text-[var(--primary)]" />
            <p className="text-sm font-semibold text-[var(--foreground)]">
              You&apos;re on the list — we&apos;ll be in touch!
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors placeholder:text-[var(--muted-foreground)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? "Subscribing…" : "Notify me"}
              {!loading && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </form>
        )}

        <p className="mt-4 text-[11px] text-[var(--muted-foreground)]">
          No spam. Unsubscribe any time. We respect your privacy.
        </p>
      </div>
    </section>
  );
}
