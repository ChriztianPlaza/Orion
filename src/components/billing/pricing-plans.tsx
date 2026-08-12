"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Download,
  Globe,
  History,
  Infinity as InfinityIcon,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PLAN_COPY, PLAN_HIGHLIGHTS } from "@/lib/plans";
import { cn } from "@/lib/utils";

const ICONS = {
  layout: LayoutGrid,
  sparkles: Sparkles,
  download: Download,
  history: History,
  infinity: InfinityIcon,
  globe: Globe,
} as const;

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
      <div className="mx-auto grid max-w-[860px] gap-5 sm:grid-cols-2">
        {(["FREE", "PRO"] as const).map((key) => {
          const copy = PLAN_COPY[key];
          const highlights = PLAN_HIGHLIGHTS[key];
          const isPro = key === "PRO";
          const current = plan === key;

          return (
            <section
              key={key}
              aria-labelledby={`plan-${key}`}
              className={cn(
                "relative flex min-h-[560px] flex-col rounded-[26px] border p-7 sm:p-8",
                isPro
                  ? "border-white/[0.14] bg-[#141414]"
                  : "border-white/[0.08] bg-[#121212]",
              )}
            >
              {isPro && (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-40 rounded-t-[26px] opacity-50"
                  style={{
                    background:
                      "radial-gradient(120% 100% at 50% 0%, rgba(41,151,255,0.13), transparent 70%)",
                  }}
                  aria-hidden="true"
                />
              )}

              <div className="relative flex flex-1 flex-col">
                <p id={`plan-${key}`} className="text-[14px] font-semibold text-white">
                  {copy.name}
                </p>

                <h2 className="mt-8 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-white">
                  {copy.heading}
                </h2>
                <p className="mt-2 text-[14.5px] leading-relaxed text-white/50">
                  {copy.subheading}
                </p>

                <p className="mt-10 flex items-baseline gap-1.5">
                  <span className="text-[46px] font-normal leading-none tracking-[-0.03em] text-white">
                    {copy.price}
                  </span>
                  <span className="text-[14px] text-white/45">/ month</span>
                </p>

                <div className="mt-6">
                  {current ? (
                    <button
                      type="button"
                      disabled
                      className="h-11 w-full cursor-default rounded-full border border-white/[0.09] text-[14px] text-white/35"
                    >
                      Your current plan
                    </button>
                  ) : isPro ? (
                    <Button size="lg" className="h-11 w-full" loading={loading} onClick={upgrade}>
                      {copy.cta}
                    </Button>
                  ) : (
                    <Link href={status === "authenticated" ? "/dashboard" : "/register"}>
                      <Button variant="outline" size="lg" className="h-11 w-full">
                        {copy.cta}
                      </Button>
                    </Link>
                  )}
                </div>

                <ul className="mt-8 space-y-4">
                  {highlights.map((item) => {
                    const Icon = ICONS[item.icon as keyof typeof ICONS] ?? Sparkles;
                    return (
                      <li key={item.label} className="flex items-center gap-3.5">
                        <Icon className="size-[18px] shrink-0 text-white/55" strokeWidth={1.5} />
                        <span className="text-[14px] text-white/85">{item.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          );
        })}
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
