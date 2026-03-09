import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminBreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminBreadcrumbProps {
  items: AdminBreadcrumbItem[];
  dir?: "ltr" | "rtl";
}

export function AdminBreadcrumb({
  items,
  dir = "ltr",
}: AdminBreadcrumbProps) {
  const SeparatorIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <nav aria-label="Breadcrumb" dir={dir}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li
              key={`${item.label}-${item.href ?? index}`}
              className="inline-flex items-center gap-1.5"
            >
              {index > 0 ? <SeparatorIcon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              {item.href && !isCurrent ? (
                <Link href={item.href} className="transition-colors hover:text-[var(--foreground)]">
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className={isCurrent ? "font-medium text-[var(--foreground)]" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
