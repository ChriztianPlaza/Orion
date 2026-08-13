import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-hairline bg-white/[0.06] text-ink",
        solid: "border-transparent bg-white text-black",
        brand: "border-[#0071e3]/30 bg-[#0071e3]/12 text-[#2997ff]",
        success: "border-[#30d158]/25 bg-[#30d158]/10 text-[#30d158]",
        warning: "border-[#ffd60a]/25 bg-[#ffd60a]/10 text-[#ffd60a]",
        danger: "border-[#ff453a]/25 bg-[#ff453a]/10 text-[#ff6961]",
        violet: "border-[#bf5af2]/25 bg-[#bf5af2]/10 text-[#d68bfa]",
        outline: "border-hairline-strong bg-transparent text-ink-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
