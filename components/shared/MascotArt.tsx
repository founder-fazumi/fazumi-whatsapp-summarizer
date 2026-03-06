import Image from "next/image";
import { cn } from "@/lib/utils";

const MASCOT_SOURCES = {
  waving: "/brand/mascot/mascot-waving.png",
  reading: "/brand/mascot/mascot-reading.png",
  thinking: "/brand/mascot/mascot-thinking.png",
  celebrating: "/brand/mascot/mascot-celebrating.png",
  error: "/brand/mascot/mascot-error.png",
} as const;

interface MascotArtProps {
  variant: keyof typeof MASCOT_SOURCES;
  alt: string;
  size?: number;
  className?: string;
  priority?: boolean;
}

export function MascotArt({
  variant,
  alt,
  size = 112,
  className,
  priority = false,
}: MascotArtProps) {
  return (
    <Image
      src={MASCOT_SOURCES[variant]}
      alt={alt}
      width={size}
      height={size}
      className={cn("object-contain", className)}
      priority={priority}
    />
  );
}
