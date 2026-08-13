"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { CONTACT_PLAN, PLAN_COPY } from "@/lib/plans";
import { cn } from "@/lib/utils";

/*
 * Where the Custom plan's "Contact us" goes. Set NEXT_PUBLIC_CONTACT_EMAIL to
 * a real inbox before launch — the fallback is deliberately obvious so an
 * unconfigured deployment cannot look like it is quietly collecting enquiries.
 */
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "set-a-contact-email@example.com";
const contactHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Orion — custom plan enquiry")}`;

export function PricingPlans({ billingConfigured }: { billingConfigured: boolean }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const plan = session?.user?.plan;

  const upgrade = async () => {
    if (status !== "authenticated") {
      router.push("/register?next=%2Fpricing");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.url) {
        toast({
          variant: "error",
          title: "Checkout unavailable",
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
    <>
      <div className="mx-auto grid max-w-[1060px] items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(["FREE", "PRO"] as const).map((key) => {
          const copy = PLAN_COPY[key];
          const isPro = key === "PRO";
          const current = plan === key;

          return (
            <section
              key={key}
              aria-labelledby={`plan-${key}`}
              className={cn(
                "relative flex flex-col rounded-[14px] border p-6 sm:p-7",
                // The featured plan is raised a step rather than outlined in a
                // brand colour — same trick the reference uses.
                isPro ? "border-hairline-strong bg-surface-2" : "border-hairline bg-surface",
              )}
            >
              <div className="flex items-center gap-2.5">
                <h2
                  id={`plan-${key}`}
                  className="text-[20px] font-semibold tracking-[-0.02em] text-ink"
                >
                  {copy.name}
                </h2>
                {isPro && (
                  <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-on-accent">
                    Most Popular
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-[13.5px] text-ink-muted">{copy.blurb}</p>

              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="text-[38px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {copy.price}
                </span>
                <span className="text-[14px] text-ink-muted">/month</span>
              </p>

              <div className="mt-6">
                {current ? (
                  <button
                    type="button"
                    disabled
                    className="h-10 w-full cursor-default rounded-full border border-hairline text-[14px] text-ink-muted"
                  >
                    Your current plan
                  </button>
                ) : isPro ? (
                  <Button className="h-10 w-full" loading={loading} onClick={upgrade}>
                    {copy.cta}
                  </Button>
                ) : (
                  <Link href={status === "authenticated" ? "/dashboard" : "/register"}>
                    <Button variant="outline" className="h-10 w-full">
                      {copy.cta}
                    </Button>
                  </Link>
                )}
              </div>

              <ul className="mt-6 space-y-3">
                {copy.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check
                      className="mt-[3px] size-3.5 shrink-0 text-ink-muted"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                    <span className="text-[13.5px] font-medium text-ink">{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {/* Handled by hand — there is no CUSTOM plan in the database. */}
        <section
          aria-labelledby="plan-CUSTOM"
          className="flex flex-col rounded-[14px] border border-hairline bg-surface p-6 sm:p-7"
        >
          <h2
            id="plan-CUSTOM"
            className="text-[20px] font-semibold tracking-[-0.02em] text-ink"
          >
            {CONTACT_PLAN.name}
          </h2>
          <p className="mt-1.5 text-[13.5px] text-ink-muted">{CONTACT_PLAN.blurb}</p>

          <p className="mt-5 text-[38px] font-semibold leading-none tracking-[-0.03em] text-ink">
            {CONTACT_PLAN.price}
          </p>

          <div className="mt-6">
            <a href={contactHref} className="block">
              <Button variant="outline" className="h-10 w-full">
                {CONTACT_PLAN.cta}
              </Button>
            </a>
          </div>

          <ul className="mt-6 space-y-3">
            {CONTACT_PLAN.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <Check
                  className="mt-[3px] size-3.5 shrink-0 text-ink-muted"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
                <span className="text-[13.5px] font-medium text-ink">{feature}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {!billingConfigured && (
        <p className="mx-auto mt-5 max-w-[860px] rounded-xl border border-[#ffd60a]/20 bg-[#ffd60a]/[0.06] px-4 py-3 text-center text-[13px] text-[#ffd60a]">
          Billing is not configured on this instance yet. Add your Stripe keys to enable Pro
          checkout.
        </p>
      )}
    </>
  );
}
