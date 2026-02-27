import { ArrowUpCircle, CreditCard, Shield } from "lucide-react";

export function CheckoutTeaser() {
  return (
    <section className="py-12 bg-[var(--background)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-6">
        {/* Upgrade banner */}
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[var(--shadow-card)]">
          {/* BG decoration */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-64 bg-white/5 [clip-path:polygon(30%_0,100%_0,100%_100%,0%_100%)]" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpCircle className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-sm">Unlock unlimited summaries</p>
            </div>
            <p className="text-white/80 text-xs leading-relaxed">
              You&apos;re on the free plan — 3 summaries remaining. Upgrade to get unlimited access, calendar sync, and Arabic output.
            </p>
          </div>
          <button
            disabled
            title="Coming soon — payment integration in progress"
            className="shrink-0 rounded-[var(--radius)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--primary)] hover:bg-white/90 transition-colors disabled:opacity-80 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Upgrade now
          </button>
        </div>

        {/* Checkout form placeholder */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="h-5 w-5 text-[var(--primary)]" />
            <h3 className="font-bold text-sm text-[var(--foreground)]">Complete your upgrade</h3>
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
              UI PREVIEW — not functional yet
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Plan select */}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">Selected plan</label>
              <div className="flex gap-3">
                {["Monthly · $9.99", "Annual · $99.99 (save 17%)"].map((p) => (
                  <label key={p} className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs cursor-pointer hover:border-[var(--primary)] transition-colors">
                    <input type="radio" name="plan" disabled className="accent-[var(--primary)]" />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">Full name</label>
              <input disabled placeholder="Aisha Al Mansoori" className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">Email</label>
              <input type="email" disabled placeholder="aisha@example.com" className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>

            {/* Card number */}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">Card number</label>
              <input disabled placeholder="4242 4242 4242 4242" className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-mono placeholder:text-[var(--muted-foreground)] outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>

            {/* Expiry + CVV */}
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">Expiry</label>
              <input disabled placeholder="MM / YY" className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">CVV</label>
              <input disabled placeholder="•••" className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>
          </div>

          <button disabled className="mt-5 w-full rounded-[var(--radius)] bg-[var(--primary)] py-3 text-sm font-bold text-white disabled:opacity-60 disabled:cursor-not-allowed">
            Pay now — integration coming soon
          </button>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
            <Shield className="h-3.5 w-3.5" />
            Secured by Stripe · 14-day money-back guarantee
          </div>
        </div>
      </div>
    </section>
  );
}
