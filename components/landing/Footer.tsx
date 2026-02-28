"use client";

import Link from "next/link";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber } from "@/lib/format";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LINKS = [
  {
    heading: { en: "Product", ar: "المنتج" },
    items: [
      { label: { en: "How it works", ar: "كيف يعمل" }, href: "/#how-it-works" },
      { label: { en: "Pricing", ar: "الأسعار" }, href: "/#pricing" },
      { label: { en: "FAQ", ar: "الأسئلة" }, href: "/#faq" },
      { label: { en: "Go to app", ar: "الذهاب إلى التطبيق" }, href: "/summarize" },
    ],
  },
  {
    heading: { en: "Legal", ar: "قانوني" },
    items: [
      { label: { en: "Privacy policy", ar: "سياسة الخصوصية" }, href: "/privacy" },
      { label: { en: "Terms of service", ar: "شروط الخدمة" }, href: "/terms" },
      { label: { en: "Cookie policy", ar: "سياسة ملفات الارتباط" }, href: "/cookie-policy" },
    ],
  },
  {
    heading: { en: "Company", ar: "الشركة" },
    items: [
      { label: { en: "About", ar: "من نحن" }, href: "/about" },
      { label: { en: "Contact", ar: "اتصل بنا" }, href: "/contact" },
      { label: { en: "Help center", ar: "مركز المساعدة" }, href: "/help" },
      { label: { en: "Status", ar: "الحالة" }, href: "/status" },
    ],
  },
];

const COPY = {
  brand: {
    en: "School group chats, summarized in seconds. Built for GCC parents.",
    ar: "محادثات مجموعات المدرسة، ملخصة خلال ثوانٍ. صُمم لأولياء الأمور في الخليج.",
  },
  rights: {
    en: "All rights reserved.",
    ar: "جميع الحقوق محفوظة.",
  },
  privacy: {
    en: "Privacy-first",
    ar: "الخصوصية أولًا",
  },
  gcc: {
    en: "Made for GCC parents",
    ar: "مصمم لأولياء الأمور في الخليج",
  },
} satisfies Record<string, LocalizedCopy<string>>;

export function Footer() {
  const { locale } = useLang();
  const year = formatNumber(new Date().getFullYear());

  return (
    <footer
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
      className={cn("border-t border-[var(--border)] bg-[var(--card)] py-12", locale === "ar" && "font-arabic")}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-base font-bold text-white select-none">
                🦊
              </span>
              <span className="text-sm font-bold text-[var(--foreground)]">Fazumi</span>
            </div>
            <p className="max-w-[180px] text-xs leading-relaxed text-[var(--muted-foreground)]">
              {pick(COPY.brand, locale)}
            </p>
          </div>

          {LINKS.map((column) => (
            <div key={column.heading.en}>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                {pick(column.heading, locale)}
              </p>
              <ul className="space-y-2">
                {column.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                    >
                      {pick(item.label, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--border)] pt-6 sm:flex-row">
          <p className="text-[11px] text-[var(--muted-foreground)]">
            © {year} Fazumi. {pick(COPY.rights, locale)}
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
              🔒 {pick(COPY.privacy, locale)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
              🇶🇦 {pick(COPY.gcc, locale)}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
