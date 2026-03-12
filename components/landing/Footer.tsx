"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { BILLING_CONTACT_EMAIL, LEGAL_CONTACT_EMAIL } from "@/lib/config/legal";

function InstaLogo(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function XLogo(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.901 1.153h3.68l-8.04 9.188 9.458 12.506h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.83L0 1.154h7.594l5.243 6.932L18.9 1.153Zm-1.29 19.47h2.039L6.486 3.417H4.298z" />
    </svg>
  );
}

// LinkedIn is intentionally omitted until an official public company page is available.
const SOCIAL_LINKS = [
  { href: "https://www.instagram.com/fazumi.app", label: "Instagram", icon: InstaLogo },
  { href: "https://x.com/FazumiApp", label: "X", icon: XLogo },
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
      { label: { en: "Help centre", ar: "مركز المساعدة" }, href: "/help" },
    ],
  },
  {
    id: "legal",
    title: { en: "Legal", ar: "قانوني" },
    links: [
      { label: { en: "Terms", ar: "الشروط" }, href: "/terms" },
      { label: { en: "Privacy", ar: "الخصوصية" }, href: "/privacy" },
      { label: { en: "Cookies", ar: "ملفات الارتباط" }, href: "/cookie-policy" },
      { label: { en: "Refunds", ar: "الاسترداد" }, href: "/refunds" },
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
  supportEmail: { en: "Support", ar: "الدعم" },
  billingEmail: { en: "Billing", ar: "الفوترة" },
} satisfies Record<string, LocalizedCopy<string>>;

export function Footer() {
  const { locale } = useLang();
  const year = String(new Date().getFullYear());
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
            <div className="mt-4 flex flex-col gap-2 text-sm text-[var(--muted-foreground)]">
              <p>
                {pick(COPY.supportEmail, locale)}:{" "}
                <a
                  href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                  className="font-medium text-[var(--primary)] hover:underline"
                  dir="ltr"
                >
                  {LEGAL_CONTACT_EMAIL}
                </a>
              </p>
              <p>
                {pick(COPY.billingEmail, locale)}:{" "}
                <a
                  href={`mailto:${BILLING_CONTACT_EMAIL}`}
                  className="font-medium text-[var(--primary)] hover:underline"
                  dir="ltr"
                >
                  {BILLING_CONTACT_EMAIL}
                </a>
              </p>
            </div>

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
