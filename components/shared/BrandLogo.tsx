import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZE_MAP = {
  sm: { px: 32,  className: "h-8 w-8"  },
  md: { px: 40,  className: "h-10 w-10" },
  lg: { px: 48,  className: "h-12 w-12" },
} as const;

interface BrandLogoProps {
  size?: keyof typeof SIZE_MAP;
  className?: string;
}

/**
 * Renders the Fazumi brand logo mark from /public/brand/logo/.
 * Use this everywhere the old 🦊 emoji appeared — Sidebar, Nav, Footer, banners, login.
 * Works in both LTR and RTL layouts (no absolute positioning that flips).
 */
export function BrandLogo({ size = "md", className }: BrandLogoProps) {
  const { px, className: sizeClass } = SIZE_MAP[size];

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--primary)]",
        sizeClass,
        className
      )}
    >
      <Image
        src="/brand/logo/fazumi-logo.svg.png"
        alt="Fazumi"
        width={px}
        height={px}
        className="h-full w-full object-contain"
        priority
      />
    </span>
  );
}
