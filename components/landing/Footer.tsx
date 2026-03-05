"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber } from "@/lib/format";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/shared/BrandLogo";

// LinkedIn is intentionally omitted until an official public company page is available.
const SOCIAL_LINKS = [
  { href: "https://facebook.com/fazumi", label: "Facebook", icon: Facebook },
  { href: "https://instagram.com/fazumi", label: "Instagram", icon: Instagram },
  { href: "https://twitter.com/fazumi", label: "Twitter/X", icon: Twitter },
  { href: "https://youtube.com/@fazumi", label: "YouTube", icon: Youtube },
] as const;

const FOOTER_GROUPS = [
  {
    id: "fazumi",
    title: { en: "Fazumi", ar: "فازومي" },
    links: [
      { label: { en: "About", ar: "من نحن" }, href: "/about" },
      { label: { en: "Pricing", ar: "الأسعار" }, href: "/pricing" },
      { label: { en: "Status", ar: "الحالة" }, href: "/status" },
    ],
  },
  {
    id: "help",
    title: { en: "Help", ar: "المساعدة" },
    links: [
      { label: { en: "Support", ar: "الدعم" }, href: "/contact" },
      { label: { en: "FAQ", ar: "الأسئلة الشائعة" }, href: "/faq" },
    ],
  },
  {
    id: "legal",
    title: { en: "Legal", ar: "قانوني" },
    links: [
      { label: { en: "Terms", ar: "الشروط" }, href: "/terms" },
      { label: { en: "Privacy", ar: "الخصوصية" }, href: "/privacy" },
      { label: { en: "Cookies", ar: "ملفات الارتباط" }, href: "/cookie-policy" },
    ],
  },
] as const;

const COPY = {
  brand: {
    en: "School chat summaries for busy parents across Qatar, UAE, Saudi Arabia, and the wider GCC.",
    ar: "ملخصات محادثات المدرسة لأولياء الأمور المشغولين في قطر والإمارات والسعودية وبقية الخليج.",
  },
  social: {
    en: "Follow Fazumi",
    ar: "تابع فازومي",
  },
  rights: {
    en: "All rights reserved.",
    ar: "جميع الحقوق محفوظة.",
  },
  support: {
    en: "Built by parents in Qatar. Focused on privacy, bilingual clarity, and calmer family coordination.",
    ar: "بناه أولياء أمور في قطر ويركز على الخصوصية والوضوح ثنائي اللغة وتنسيق العائلة بهدوء.",
  },
} satisfies Record<string, LocalizedCopy<string>>;

export function Footer() {
  const { locale } = useLang();
  const year = formatNumber(new Date().getFullYear());
  const [openSection, setOpenSection] = useState<string | null>(FOOTER_GROUPS[0].id);

  return (
    <footer
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
      className={cn("border-t border-[var(--border)] bg-[var(--page-layer)] py-12", locale === "ar" && "font-arabic")}
    >
      <div className="page-shell">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.35fr)]">
          <div className="max-w-md">
            <div className="flex items-center gap-2">
              <BrandLogo size="md" />
              <span className="text-lg font-bold text-[var(--foreground)]">Fazumi</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
              {pick(COPY.brand, locale)}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
              {pick(COPY.support, locale)}
            </p>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                {pick(COPY.social, locale)}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {SOCIAL_LINKS.map(({ href, icon: Icon, label }) => (
                  <Link
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted-foreground)] shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
                    aria-label={label}
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden md:grid md:grid-cols-3 md:gap-8">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.id}>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  {pick(group.title, locale)}
                </h3>
                <ul className="mt-4 space-y-3">
                  {group.links.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                      >
                        {pick(item.label, locale)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] md:hidden">
            {FOOTER_GROUPS.map((group, index) => {
              const isOpen = openSection === group.id;

              return (
                <div
                  key={group.id}
                  className={cn(index !== FOOTER_GROUPS.length - 1 && "border-b border-[var(--border)]")}
                >
                  <button
                    type="button"
                    onClick={() => setOpenSection(isOpen ? null : group.id)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {pick(group.title, locale)}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-[var(--muted-foreground)] transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {isOpen ? (
                    <ul className="space-y-3 px-5 pb-4">
                      {group.links.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                          >
                            {pick(item.label, locale)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted-foreground)]">
            © {year} Fazumi. {pick(COPY.rights, locale)}
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/privacy"
              className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              {pick({ en: "Privacy-first", ar: "الخصوصية أولًا" }, locale)}
            </Link>
            <Link
              href="/faq"
              className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              {pick({ en: "FAQ", ar: "الأسئلة الشائعة" }, locale)}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
