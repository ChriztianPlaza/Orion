"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A single-line horizontal strip with arrow controls at either end.
 *
 * The strip alone hides its scrollbar, which looks clean but leaves no way to
 * reach the overflow with a mouse — the arrows are that affordance. They only
 * appear when the content actually overflows, and the one pointing at an edge
 * you have already reached is disabled rather than removed, so the controls do
 * not shift around as you scroll.
 */
export function ScrollRow({
  children,
  label,
  className,
  step = 320,
}: {
  children: React.ReactNode;
  /** Announced to screen readers as the group name. */
  label: string;
  className?: string;
  /** Pixels moved per arrow press, capped to one viewport of the strip. */
  step?: number;
}) {
  const viewport = React.useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = React.useState(false);
  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(false);

  const sync = React.useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setOverflowing(max > 1);
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  // Overflow depends on both the content and the container width, so remeasure
  // on resize as well as on scroll.
  React.useEffect(() => {
    sync();
    const el = viewport.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [sync, children]);

  const nudge = (direction: 1 | -1) => {
    const el = viewport.current;
    if (!el) return;
    const distance = Math.min(step, el.clientWidth * 0.85);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * distance, behavior: reduced ? "auto" : "smooth" });
  };

  /*
   * The arrows sit beside the strip rather than on top of it. Overlaying them
   * meant chips slid underneath as you scrolled — padding on a scroll
   * container stays with the content, so it stops protecting anything once
   * you move. They also always render, disabled when they cannot act: showing
   * and hiding them would resize the strip, which changes whether it overflows.
   */
  return (
    <div className="flex items-center gap-2">
      <Arrow
        side="left"
        disabled={!overflowing || atStart}
        onClick={() => nudge(-1)}
        label={`Scroll ${label} left`}
      />

      <div
        ref={viewport}
        onScroll={sync}
        role="group"
        aria-label={label}
        className={cn(
          "scrollbar-none mask-fade-x -my-1 flex min-w-0 flex-1 gap-2 overflow-x-auto py-1",
          className,
        )}
      >
        {children}
      </div>

      <Arrow
        side="right"
        disabled={!overflowing || atEnd}
        onClick={() => nudge(1)}
        label={`Scroll ${label} right`}
      />
    </div>
  );
}

function Arrow({
  side,
  disabled,
  onClick,
  label,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      // 44px hit area around a 32px visual control, per touch-target guidance.
      className={cn(
        "grid size-11 shrink-0 place-items-center",
        disabled ? "cursor-default" : "cursor-pointer",
      )}
    >
      <span
        className={cn(
          "grid size-8 place-items-center rounded-full border transition-colors duration-150",
          disabled
            ? "border-hairline text-ink-faint"
            : "border-hairline text-ink-muted hover:border-hairline-strong hover:text-ink",
        )}
      >
        <Icon className="size-4" />
      </span>
    </button>
  );
}
