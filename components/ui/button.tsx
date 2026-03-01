import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:bg-[var(--primary-hover)]",
        destructive:
          "bg-[var(--destructive)] text-white shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:brightness-95",
        outline:
          "border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-[var(--shadow-xs)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]",
        secondary:
          "bg-[var(--surface-muted)] text-[var(--foreground)] shadow-[var(--shadow-xs)] hover:bg-[var(--accent)]",
        ghost:
          "text-[var(--foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
        link: "text-[var(--primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-[var(--radius-sm)] px-3 text-xs",
        lg: "h-12 rounded-[var(--radius-lg)] px-8 text-base",
        icon: "h-9 w-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
