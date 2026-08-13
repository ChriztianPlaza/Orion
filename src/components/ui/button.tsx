import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // 150ms is the responsive end of the micro-interaction range; the old 300ms
  // made every button feel a beat behind the pointer.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:pointer-events-none disabled:opacity-40 [&_svg]:shrink-0 select-none active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary: "bg-ink text-on-accent hover:bg-white",
        secondary:
          "bg-surface-2 text-ink border border-hairline hover:bg-surface-3 hover:border-hairline-strong",
        ghost: "text-ink-muted hover:text-ink hover:bg-surface-2",
        outline: "border border-hairline text-ink hover:bg-surface-2 hover:border-hairline-strong",
        brand: "bg-brand text-white hover:bg-[#0077ed]",
        danger:
          "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 hover:border-danger/50",
        link: "text-ink-muted hover:text-ink underline-offset-4 hover:underline p-0 h-auto",
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
