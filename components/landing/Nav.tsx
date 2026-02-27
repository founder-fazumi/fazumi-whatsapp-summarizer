import Link from "next/link";

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--primary)] text-white text-base leading-none">
            🦊
          </div>
          <span className="font-bold text-base text-[var(--foreground)]">Fazumi</span>
          <span className="hidden sm:inline-block rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
            BETA
          </span>
        </Link>

        {/* Right links */}
        <div className="flex items-center gap-4">
          <Link
            href="#pricing"
            className="hidden sm:block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="#faq"
            className="hidden md:block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            FAQ
          </Link>
          <Link
            href="/summarize"
            className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
          >
            Go to app →
          </Link>
        </div>
      </div>
    </nav>
  );
}
