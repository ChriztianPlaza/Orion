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

  return (
    <div className="relative">
      <div
        ref={viewport}
        onScroll={sync}
        role="group"
        aria-label={label}
        className={cn(
          "scrollbar-none mask-fade-x -mx-1 flex gap-2 overflow-x-auto px-1 pb-1",
          // Room for the arrows to sit over, only once they are showing.
          overflowing && "pl-11 pr-11",
          className,
        )}
      >
        {children}
      </div>

      {overflowing && (
        <>
          <Arrow side="left" disabled={atStart} onClick={() => nudge(-1)} label={`Scroll ${label} left`} />
          <Arrow side="right" disabled={atEnd} onClick={() => nudge(1)} label={`Scroll ${label} right`} />
        </>
      )}
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
      // 44px hit area around a 30px visual control, per touch-target guidance.
      className={cn(
        "absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center",
        side === "left" ? "-left-2" : "-right-2",
        disabled ? "cursor-default" : "cursor-pointer",
      )}
    >
      <span
        className={cn(
          "grid size-[30px] place-items-center rounded-full border backdrop-blur-md transition-all duration-200",
          disabled
            ? "border-hairline bg-black/40 text-ink-dim"
            : "border-hairline-strong bg-black/70 text-ink hover:border-white/30 hover:bg-black hover:text-white active:scale-95",
        )}
      >
        <Icon className="size-4" />
      </span>
    </button>
  );
}
