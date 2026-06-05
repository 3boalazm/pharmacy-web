"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** shadcn/ui Button themed by the system design tokens (globals.css). */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-el text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-white shadow-sm hover:bg-primary-ink",
        secondary: "border border-line bg-card text-ink hover:border-ink-faint",
        ghost: "text-ink-soft hover:bg-primary-soft hover:text-primary-ink",
        destructive: "bg-danger text-white hover:opacity-90",
        outline: "border border-primary text-primary-ink hover:bg-primary-soft",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4",
        lg: "h-12 px-6 text-base font-semibold",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} disabled={disabled || loading} className={cn(buttonVariants({ variant, size }), className)} {...props}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";
