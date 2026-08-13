"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PartyPopper, X } from "lucide-react";

/**
 * Shown after returning from Stripe checkout.
 *
 * The subscription is activated by the webhook, not by this page, so the banner
 * refreshes the session a couple of times to pick up the new plan rather than
 * claiming success on the strength of a query parameter.
 */
export function CheckoutResultBanner() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [dismissed, setDismissed] = React.useState(false);
  const attempts = React.useRef(0);

  React.useEffect(() => {
    if (session?.user?.plan === "PRO") {
      router.refresh();
      return;
    }
    if (attempts.current >= 4) return;

    const timer = setTimeout(() => {
      attempts.current += 1;
      void update();
    }, 1500 * (attempts.current + 1));

    return () => clearTimeout(timer);
  }, [session?.user?.plan, update, router]);

  if (dismissed) return null;

  const active = session?.user?.plan === "PRO";

  return (
    <div className="mb-6 flex items-start gap-3 rounded-[12px] border border-[#30d158]/25 bg-[#30d158]/[0.06] px-4 py-3.5">
      <PartyPopper className="mt-0.5 size-4 shrink-0 text-[#30d158]" />
      <div className="flex-1">
        <p className="text-[14px] font-medium text-white">
          {active ? "You're on Pro" : "Payment received — activating your plan"}
        </p>
        <p className="mt-1 text-[13px] text-ink-muted">
          {active
            ? "50 projects, 50 downloads a week, and the premium and animated templates are unlocked."
            : "Stripe is confirming the subscription. This usually takes a few seconds."}
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="rounded-lg p-1 text-ink-dim transition-colors hover:text-white"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
