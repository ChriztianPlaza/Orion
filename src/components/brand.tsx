import { cn } from "@/lib/utils";

/**
 * The Orion mark: the constellation itself — two shoulders, two feet and the
 * three belt stars running across the middle. Drawn with currentColor so it
 * inherits wherever it sits, and it still reads as a star cluster at 16px.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-[22px]", className)}
    >
      {/* Constellation lines, kept faint so they never muddy the small sizes. */}
      <path
        d="M6.6 5.6 9.4 15.1M17.4 7 15 12.2M9.4 15.1 6.8 20M15 12.2 18 19.2M6.6 5.6 17.4 7"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.28"
      />
      {/* Shoulders */}
      <circle cx="6.6" cy="5.6" r="2.5" fill="currentColor" />
      <circle cx="17.4" cy="7" r="1.7" fill="currentColor" opacity="0.75" />
      {/* Belt */}
      <circle cx="9.4" cy="15.1" r="1.35" fill="currentColor" />
      <circle cx="12.2" cy="13.7" r="1.35" fill="currentColor" />
      <circle cx="15" cy="12.2" r="1.35" fill="currentColor" />
      {/* Feet */}
      <circle cx="6.8" cy="20" r="1.6" fill="currentColor" opacity="0.75" />
      <circle cx="18" cy="19.2" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5 text-white", className)}>
      <Mark />
      <span className="text-[15px] font-semibold tracking-[-0.02em]">Orion</span>
    </span>
  );
}
