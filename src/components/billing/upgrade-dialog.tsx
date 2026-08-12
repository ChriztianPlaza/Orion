"use client";

import * as React from "react";
import { Check, Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PLAN_COPY, PRO_PRICE_USD } from "@/lib/plans";

/**
 * Shown whenever the server refuses an action with 402. Copy comes from the
 * server's reason string so the dialog always explains the specific limit that
 * was hit rather than a generic upsell.
 */
export function UpgradeDialog({
  open,
  reason,
  onClose,
}: {
  open: boolean;
  reason: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const startCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.url) {
        toast({
          variant: "error",
          title: "Checkout unavailable",
          description:
            payload.message ?? "Billing is not configured yet. Please contact support.",
        });
        return;
      }
      window.location.href = payload.url as string;
    } catch {
      toast({ variant: "error", title: "Network error", description: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="You've reached your free plan limit"
      description={reason}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Not now
          </Button>
          <Button onClick={startCheckout} loading={loading} data-autofocus>
            Upgrade to Pro — ${PRO_PRICE_USD}/mo
          </Button>
        </>
      }
    >
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-5">
        <div className="flex items-center gap-2 text-[13px] font-medium text-white">
          <Sparkles className="size-4 text-[#2997ff]" />
          Everything in Pro
        </div>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {PLAN_COPY.PRO.features.slice(0, 6).map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-[13.5px] text-white/60">
              <Check className="mt-0.5 size-3.5 shrink-0 text-white/30" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
