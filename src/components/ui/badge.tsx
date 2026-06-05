import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    tone: {
      green: "bg-primary-soft text-primary-ink",
      red: "bg-danger-soft text-danger",
      amber: "bg-warn-soft text-warn",
      blue: "bg-info-soft text-info",
      gray: "bg-paper text-ink-soft",
    },
  },
  defaultVariants: { tone: "gray" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
