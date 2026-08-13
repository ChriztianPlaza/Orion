import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * A solid near-black field with a visible border, and a focus ring you can
 * actually see — the previous `ring-white/[0.04]` was invisible on black, so
 * keyboard users had no idea where they were.
 */
/*
 * The focus ring is a literal box-shadow rather than Tailwind's `ring-*`
 * utilities. Both work, but `ring-*` resolves through a chain of
 * `--tw-ring-*` custom properties that any stray `shadow-*` on a caller can
 * flatten; a plain shadow has no such failure mode.
 */
const FOCUS_RING =
  "focus:border-white/45 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.14)]";

const base =
  "w-full rounded-md border border-hairline bg-surface-2 px-3.5 text-sm text-ink placeholder:text-ink-dim transition-[border-color,box-shadow] duration-150 outline-none disabled:cursor-not-allowed disabled:opacity-50 " +
  FOCUS_RING;

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(base, "h-10", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, "min-h-[88px] py-2.5 leading-relaxed resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    // `[color-scheme:dark]` is what makes the OS-drawn option list dark. Without
    // it the popup renders in the system light theme regardless of our styling.
    className={cn(base, "h-10 appearance-none pr-9 [color-scheme:dark]", className)}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5' stroke='%23a1a1aa' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 12px center",
    }}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

/**
 * An input with a leading icon.
 *
 * The border and focus ring live on the wrapper rather than the field, so the
 * icon sits inside the control instead of floating next to it. The inner input
 * is stripped of its own chrome and inherits focus through `focus-within`.
 */
export const InputGroup = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode }
>(({ className, icon, ...props }, ref) => (
  <div
    // `field-shell` is what moves the focus ring onto the whole control —
    // see the rule in globals.css.
    className={cn(
      "field-shell flex h-12 items-center gap-2.5 rounded-md border border-hairline bg-surface-2 px-3.5",
      "transition-colors duration-150",
      "focus-within:border-white/45",
      "has-[input:disabled]:opacity-50",
      className,
    )}
  >
    <span className="shrink-0 text-ink-dim [&_svg]:size-[18px]" aria-hidden="true">
      {icon}
    </span>
    <input
      ref={ref}
      // The shell owns the focus ring; `.field-shell :focus-visible` in
      // globals.css is what actually suppresses this one.
      className="h-full w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-dim disabled:cursor-not-allowed"
      {...props}
    />
  </div>
));
InputGroup.displayName = "InputGroup";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-[13px] font-medium text-ink", className)}
      {...props}
    />
  );
}

export function FieldHint({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1.5 text-xs text-ink-muted", className)} {...props} />;
}
