"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Six single-character boxes that behave like one field.
 *
 * Typing advances, Backspace on an empty box steps back, paste fills the whole
 * code, and the browser's SMS/email autofill works because the first box keeps
 * `autoComplete="one-time-code"`.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  length = 6,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  length?: number;
}) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;

    const next = value.padEnd(length, " ").split("");
    next[index] = digit;
    commit(next.join("").replace(/ /g, ""));

    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = value.split("");
      if (next[index]) {
        next.splice(index, 1);
        commit(next.join(""));
      } else if (index > 0) {
        next.splice(index - 1, 1);
        commit(next.join(""));
        refs.current[index - 1]?.focus();
      }
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    commit(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} of ${length}`}
          maxLength={1}
          disabled={disabled}
          value={digits[index]?.trim() ?? ""}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
          className={cn(
            "size-12 rounded-xl border bg-white/[0.04] text-center font-mono text-[20px] text-white outline-none transition-all duration-200",
            "focus:border-white/30 focus:bg-white/[0.07] focus:ring-4 focus:ring-white/[0.05]",
            invalid ? "border-[#ff453a]/50" : "border-white/10",
            disabled && "opacity-50",
          )}
        />
      ))}
    </div>
  );
}
