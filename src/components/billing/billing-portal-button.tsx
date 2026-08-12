"use client";

import * as React from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function BillingPortalButton() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const open = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.url) {
        toast({
          variant: "error",
          title: "Billing portal unavailable",
          description: payload.message ?? "Please try again shortly.",
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
    <Button variant="secondary" onClick={open} loading={loading}>
      <CreditCard /> Manage billing
    </Button>
  );
}
