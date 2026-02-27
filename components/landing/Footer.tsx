import Link from "next/link";

const LINKS = [
  {
    heading: "Product",
    items: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
      { label: "Go to app", href: "/summarize" },
    ],
  },
  {
    heading: "Legal",
    items: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
      { label: "Cookie policy", href: "/cookies" },
    ],
  },
  {
    heading: "Support",
    items: [
      { label: "Help center", href: "/help" },
      { label: "Contact us", href: "mailto:hello@fazumi.app" },
      { label: "Status", href: "/status" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--card)] py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white text-base font-bold select-none">
                🦊
              </span>
              <span className="text-sm font-bold text-[var(--foreground)]">
                Fazumi
              </span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed max-w-[180px]">
              School group chats, summarized in seconds. Built for GCC parents.
            </p>
          </div>

          {/* Link columns */}
          {LINKS.map((col) => (
            <div key={col.heading}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-3">
                {col.heading}
              </p>
              <ul className="space-y-2">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--border)] pt-6">
          <p className="text-[11px] text-[var(--muted-foreground)]">
            © {new Date().getFullYear()} Fazumi. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
              🔒 Privacy-first
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
              🇶🇦 Made for GCC parents
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
