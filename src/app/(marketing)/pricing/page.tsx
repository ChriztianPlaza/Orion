import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PricingPlans } from "@/components/billing/pricing-plans";
import { isStripeConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free forever for five websites and a download a month. Pro at $20/month for 50 projects, 50 downloads a week and the premium template library.",
  alternates: { canonical: "/pricing" },
};

type Cellish = string | boolean;

const COMPARISON: { feature: string; free: Cellish; pro: Cellish; custom: Cellish }[] = [
  { feature: "Website projects", free: "5", pro: "50", custom: "Unlimited" },
  { feature: "Website downloads", free: "1 per month", pro: "50 per week", custom: "Unlimited" },
  { feature: "Free templates", free: true, pro: true, custom: true },
  { feature: "Premium templates", free: false, pro: true, custom: true },
  { feature: "Animated templates", free: false, pro: true, custom: true },
  { feature: "Visual editor", free: true, pro: true, custom: true },
  { feature: "Live responsive preview", free: true, pro: true, custom: true },
  { feature: "Multi-page templates", free: true, pro: true, custom: true },
  { feature: "Image uploads", free: "5 MB each", pro: "25 MB each", custom: "Negotiable" },
  { feature: "Host anywhere you like", free: true, pro: true, custom: true },
  { feature: "Version history", free: "3 versions", pro: "50 versions", custom: "50 versions" },
  { feature: "Priority support", free: false, pro: true, custom: true },
];

const FAQ = [
  {
    q: "What happens to my website if I cancel?",
    a: "Your projects stay in your account and you keep everything you have already downloaded — including any sites you have already put online, which are hosted elsewhere and are not affected. You return to the free plan's limits, so new downloads are restricted again.",
  },
  {
    q: "How does the free download allowance work?",
    a: "One download every 30 days, enforced on the server. The download you take is a complete, working website — you can host it anywhere, forever, at no cost, and it stays yours after the allowance resets.",
  },
  {
    q: "Does Orion host my website?",
    a: "No, and that is deliberate. You download a folder of plain HTML and CSS and put it on any static host — Netlify, Cloudflare Pages, GitHub Pages and Vercel all take it for free. The hosting guide walks through each one step by step.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. Buy a domain for roughly $10 a year and point it at whichever free host you chose. All of the hosts in the guide support custom domains at no extra cost, with free SSL.",
  },
  {
    q: "Do you take a cut of anything I build?",
    a: "No. The exported files are yours outright. Templates are MIT licensed, and any imported template's own license and attribution are shown on its page.",
  },
];

export default function PricingPage() {
  return (
    <div className="container-page py-16 sm:py-24">
      <header className="mx-auto mb-14 max-w-[52ch] text-center">
        <h1 className="text-balance-tight text-[clamp(2.2rem,4.5vw,3.4rem)] font-semibold">
          Free to build. Twenty dollars to go pro.
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed text-ink-muted">
          Build and download a complete website without paying anything. Hosting is free on every
          plan — upgrade when you want more projects and more downloads.
        </p>
      </header>

      <PricingPlans billingConfigured={isStripeConfigured()} />

      <section className="mt-24">
        <h2 className="mb-8 text-center text-[22px] font-semibold tracking-[-0.02em]">
          Compare plans
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-hairline">
                <th scope="col" className="py-3 text-left font-medium text-ink-muted">
                  Feature
                </th>
                <th scope="col" className="w-32 py-3 text-center font-medium text-ink-muted">
                  Free
                </th>
                <th scope="col" className="w-32 py-3 text-center font-medium text-ink">
                  Pro
                </th>
                <th scope="col" className="w-32 py-3 text-center font-medium text-ink-muted">
                  Custom
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="border-b border-hairline">
                  <th scope="row" className="py-3 text-left font-normal text-ink">
                    {row.feature}
                  </th>
                  <Cell value={row.free} />
                  <Cell value={row.pro} emphasis />
                  <Cell value={row.custom} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-[720px]">
        <div className="card-surface flex flex-wrap items-center justify-between gap-5 rounded-[12px] p-6">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold">Hosting is free on every plan</h2>
            <p className="mt-1.5 max-w-[56ch] text-[14px] leading-relaxed text-ink-muted">
              Orion exports plain files, so you host them wherever you like. The guide covers four
              hosts that are free forever, and what a custom domain actually costs.
            </p>
          </div>
          <Link href="/guides/deploy" className="shrink-0">
            <Button variant="secondary">Read the hosting guide</Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-[720px]">
        <h2 className="mb-8 text-center text-[22px] font-semibold tracking-[-0.02em]">
          Common questions
        </h2>
        <div className="divide-y divide-hairline border-y border-hairline">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[15px] font-medium text-ink hover:text-white">
                {item.q}
                <span className="shrink-0 text-ink-dim transition-transform duration-300 group-open:rotate-45">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function Cell({ value, emphasis }: { value: Cellish; emphasis?: boolean }) {
  if (typeof value === "boolean") {
    return (
      <td className="py-3 text-center">
        {value ? (
          <span className={emphasis ? "text-white" : "text-ink-muted"} aria-label="Included">
            ✓
          </span>
        ) : (
          <span className="text-ink-dim" aria-label="Not included">
            —
          </span>
        )}
      </td>
    );
  }
  return (
    <td className={`py-3 text-center ${emphasis ? "text-white" : "text-ink-muted"}`}>{value}</td>
  );
}
