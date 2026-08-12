import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:pointer-events-none disabled:opacity-40 [&_svg]:shrink-0 select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-white text-black hover:bg-white/90 shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset]",
        secondary:
          "bg-white/[0.06] text-white border border-white/10 hover:bg-white/[0.1] hover:border-white/20",
        ghost: "text-white/70 hover:text-white hover:bg-white/[0.06]",
        outline:
          "border border-white/15 text-white hover:bg-white/[0.05] hover:border-white/25",
        brand:
          "bg-[#0071e3] text-white hover:bg-[#0077ed] shadow-[0_0_24px_-6px_rgba(0,113,227,0.7)]",
        danger:
          "bg-[#ff453a]/10 text-[#ff6961] border border-[#ff453a]/25 hover:bg-[#ff453a]/20",
        link: "text-white/70 hover:text-white underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-8 rounded-full px-3.5 text-[13px] [&_svg]:size-3.5",
        md: "h-10 rounded-full px-5 text-sm [&_svg]:size-4",
        lg: "h-12 rounded-full px-7 text-[15px] [&_svg]:size-4",
        icon: "h-9 w-9 rounded-full [&_svg]:size-4",
        "icon-sm": "h-7 w-7 rounded-lg [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export { buttonVariants };
