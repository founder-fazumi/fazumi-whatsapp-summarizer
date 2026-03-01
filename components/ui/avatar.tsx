"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function getInitials(name?: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE: Record<string, string> = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--primary-soft)] font-bold text-[var(--primary)] select-none shadow-[var(--shadow-xs)]",
        SIZE[size],
        className
      )}
    >
      {src && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? ""}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
