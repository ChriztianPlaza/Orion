"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/**
 * Minimal accessible dialog: focus trap, Escape to close, scroll lock,
 * labelled by its heading. Kept dependency-free so the bundle stays small.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  dismissible?: boolean;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) return;

    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const focusTimer = setTimeout(() => {
      const target =
        panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panelRef.current;
      target?.focus();
    }, 30);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      clearTimeout(focusTimer);
      previous?.focus?.();
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="fixed inset-0 animate-fade-in bg-black/70 backdrop-blur-sm"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "glass relative w-full animate-[fade-up_.35s_cubic-bezier(0.16,1,0.3,1)] rounded-[14px] p-6 shadow-[0_40px_120px_-40px_rgba(0,0,0,1)] outline-none sm:p-7",
          size === "sm" && "max-w-md",
          size === "md" && "max-w-lg",
          size === "lg" && "max-w-2xl",
        )}
      >
        {dismissible && (
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="size-4" />
          </button>
        )}

        <h2 id={titleId} className="pr-8 text-[19px] font-semibold tracking-[-0.02em]">
          {title}
        </h2>
        {description && (
          <div className="mt-2.5 text-[14px] leading-relaxed text-ink-muted">{description}</div>
        )}
        {children && <div className="mt-6">{children}</div>}
        {footer && <div className="mt-7 flex flex-wrap justify-end gap-2.5">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  loading = false,
  destructive = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  destructive?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
            data-autofocus
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
