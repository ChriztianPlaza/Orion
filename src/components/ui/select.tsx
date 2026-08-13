"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A styled replacement for the native `<select>`.
 *
 * The native control's popup is drawn by the operating system: CSS reaches
 * `color-scheme` and, on some browsers, `option` colours — and nothing else.
 * No radius, no padding, no type, and the selected row keeps the OS accent.
 * On a dark, tightly-designed page it always looked like a foreign object.
 *
 * So the visible control is ours and a real `<select>` is kept in the DOM,
 * hidden, to carry the value. That matters twice over: it keeps the component
 * usable inside a `<form>`, and it lets us emit a genuine change event rather
 * than a hand-made object pretending to be one — so every existing call site
 * keeps working with `event.target.value` and no edits.
 */

type Option = { value: string; label: string; disabled?: boolean };

/** Reads `<option>` children so callers keep the markup they already have. */
function readOptions(children: React.ReactNode): Option[] {
  const out: Option[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement> & {
      children?: React.ReactNode;
    };
    out.push({
      value: String(props.value ?? ""),
      label: String(props.children ?? props.value ?? ""),
      disabled: props.disabled,
    });
  });
  return out;
}

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, disabled, "aria-label": ariaLabel, id, ...props }, forwardedRef) => {
  const options = React.useMemo(() => readOptions(children), [children]);

  const nativeRef = React.useRef<HTMLSelectElement>(null);
  React.useImperativeHandle(forwardedRef, () => nativeRef.current as HTMLSelectElement);

  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [rect, setRect] = React.useState<{ top: number; left: number; width: number } | null>(null);

  const listId = React.useId();
  const current = String(props.value ?? "");
  const selected = options.find((option) => option.value === current) ?? options[0];
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === current),
  );

  /*
   * Sets the value on the hidden <select> through the native setter, then
   * fires a real `change`. Assigning `.value` directly would not reach React,
   * which tracks the previous value on the node itself.
   */
  const commit = React.useCallback((value: string) => {
    const element = nativeRef.current;
    if (!element || element.value === value) return;

    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement.prototype,
      "value",
    )?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, []);

  /*
   * The popup is fixed rather than absolute so it escapes the `overflow-y-auto`
   * panels in the editor, which would otherwise clip it. Fixed coordinates go
   * stale when anything scrolls, so the list closes instead of drifting.
   */
  const place = React.useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const box = button.getBoundingClientRect();
    setRect({ top: box.bottom + 6, left: box.left, width: box.width });
  }, []);

  const openList = React.useCallback(() => {
    place();
    setActiveIndex(selectedIndex);
    setOpen(true);
  }, [place, selectedIndex]);

  const close = React.useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (listRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close(false);
    };
    const onScrollOrResize = () => close(false);

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, close]);

  // Keep the highlighted row in view when arrowing through a long list.
  React.useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const step = (delta: number) => {
    setActiveIndex((index) => {
      let next = index;
      for (let i = 0; i < options.length; i += 1) {
        next = (next + delta + options.length) % options.length;
        if (!options[next]?.disabled) return next;
      }
      return index;
    });
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "ArrowDown":
        event.preventDefault();
        step(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        step(-1);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ": {
        event.preventDefault();
        const option = options[activeIndex];
        if (option && !option.disabled) {
          commit(option.value);
          close();
        }
        break;
      }
      case "Tab":
        close(false);
        break;
      default:
        // Type-ahead, the one native behaviour people miss most.
        if (event.key.length === 1) {
          const key = event.key.toLowerCase();
          const found = options.findIndex(
            (option, index) =>
              index > activeIndex && !option.disabled && option.label.toLowerCase().startsWith(key),
          );
          const wrapped =
            found === -1
              ? options.findIndex(
                  (option) => !option.disabled && option.label.toLowerCase().startsWith(key),
                )
              : found;
          if (wrapped !== -1) setActiveIndex(wrapped);
        }
    }
  };

  return (
    <>
      {/* Carries the value for forms and for React's change event. */}
      <select
        ref={nativeRef}
        id={id}
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        className="sr-only"
        {...props}
      >
        {children}
      </select>

      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-hairline bg-surface-2 px-3.5 text-left text-sm text-ink",
          "transition-colors duration-150 hover:border-hairline-strong",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-hairline-strong",
          className,
        )}
      >
        <span className="truncate">{selected?.label ?? ""}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-ink-dim transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && rect && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          style={{ top: rect.top, left: rect.left, minWidth: rect.width }}
          className="glass fixed z-[90] max-h-[280px] animate-fade-in overflow-y-auto rounded-[10px] p-1 shadow-[var(--shadow-overlay)]"
        >
          {options.map((option, index) => {
            const isSelected = option.value === current;
            return (
              <li
                key={option.value}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                onPointerEnter={() => !option.disabled && setActiveIndex(index)}
                onClick={() => {
                  if (option.disabled) return;
                  commit(option.value);
                  close();
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-[13.5px]",
                  option.disabled && "cursor-not-allowed opacity-40",
                  index === activeIndex && !option.disabled ? "bg-surface-3 text-ink" : "text-ink-muted",
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="size-3.5 shrink-0 text-ink" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
});
Select.displayName = "Select";
