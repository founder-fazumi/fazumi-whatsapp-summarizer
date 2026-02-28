import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LocalizedTextProps {
  en: ReactNode;
  ar: ReactNode;
  className?: string;
  enClassName?: string;
  arClassName?: string;
}

export function LocalizedText({
  en,
  ar,
  className,
  enClassName,
  arClassName,
}: LocalizedTextProps) {
  return (
    <>
      <span
        data-localized-text="en"
        lang="en"
        className={cn(className, enClassName)}
      >
        {en}
      </span>
      <span
        data-localized-text="ar"
        lang="ar"
        dir="rtl"
        className={cn(className, "font-arabic", arClassName)}
      >
        {ar}
      </span>
    </>
  );
}
