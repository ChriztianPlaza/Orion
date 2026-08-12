"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";
type Toast = { id: number; title: string; description?: string; variant: ToastVariant };

type ToastContextValue = {
  toast: (input: { title: string; description?: string; variant?: ToastVariant }) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    ({ title, description, variant = "info" }) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-3), { id, title, description, variant }]);
      setTimeout(() => dismiss(id), variant === "error" ? 7000 : 4200);
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[min(360px,calc(100vw-40px))] flex-col gap-2.5"
        role="status"
        aria-live="polite"
      >
        {toasts.map((item) => {
          const Icon = ICONS[item.variant];
          return (
            <div
              key={item.id}
              className={cn(
                "glass pointer-events-auto flex animate-[fade-up_.35s_cubic-bezier(0.16,1,0.3,1)] items-start gap-3 rounded-2xl px-4 py-3.5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]",
                item.variant === "error" && "border-[#ff453a]/25",
                item.variant === "success" && "border-[#30d158]/25",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  item.variant === "success" && "text-[#30d158]",
                  item.variant === "error" && "text-[#ff6961]",
                  item.variant === "info" && "text-[#2997ff]",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-white">{item.title}</p>
                {item.description && (
                  <p className="mt-1 text-[13px] leading-relaxed text-white/50">{item.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="-mr-1 -mt-1 rounded-lg p-1 text-white/35 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
