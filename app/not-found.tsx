import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[65vh] w-full max-w-3xl flex-col justify-center px-4 py-14 sm:px-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-8 shadow-[var(--shadow-sm)] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
          404
        </p>
        <h1 className="mt-3 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
          Page not found
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
          The page you are looking for does not exist or has been moved.
        </p>

        <div className="mt-7 border-t border-[var(--border)] pt-6 text-right" dir="rtl" lang="ar">
          <h2 className="text-xl font-bold text-[var(--foreground)]">الصفحة غير موجودة</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
            الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-xs)] transition-colors hover:bg-[var(--primary-hover)]"
          >
            Go Home
          </Link>
          <Link
            href="/"
            dir="rtl"
            lang="ar"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)] transition-colors hover:bg-[var(--surface-muted)]"
          >
            العودة إلى الرئيسية
          </Link>
        </div>
      </div>
    </main>
  );
}
