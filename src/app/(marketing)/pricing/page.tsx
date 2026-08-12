import type { Metadata } from "next";
import { PricingPlans } from "@/components/billing/pricing-plans";
import { isStripeConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free forever for one website. Pro at $20/month for unlimited websites, unlimited downloads and one-click deployment.",
  alternates: { canonical: "/pricing" },
};

const COMPARISON: { feature: string; free: string | boolean; pro: string | boolean }[] = [
  { feature: "Website projects", free: "1", pro: "Unlimited" },
  { feature: "Template marketplace", free: true, pro: true },
  { feature: "Visual editor", free: true, pro: true },
  { feature: "Live responsive preview", free: true, pro: true },
  { feature: "Multi-page templates", free: true, pro: true },
  { feature: "Image uploads", free: true, pro: true },
  { feature: "Website downloads", free: "1 total", pro: "Unlimited" },
  { feature: "Version history", free: "3 versions", pro: "50 versions" },
  { feature: "Cloudflare Pages deployment", free: false, pro: true },
  { feature: "Custom deployment name", free: false, pro: true },
  { feature: "Redeploy after editing", free: false, pro: true },
  { feature: "Deployment history and logs", free: false, pro: true },
  { feature: "Premium template library", free: false, pro: true },
  { feature: "Priority support", free: false, pro: true },
];

const FAQ = [
  {
    q: "What happens to my website if I cancel?",
    a: "Your projects stay in your account and you keep everything you have already downloaded. You return to the free plan's limits, so deployment stops being available and new downloads are restricted.",
  },
  {
    q: "Is the download really limited to one on the free plan?",
    a: "Yes, and it is enforced on the server. The download you take is a complete, working website — you can host it anywhere, forever, at no cost.",
  },
  {
    q: "Can I use my own domain?",
    a: "Cloudflare Pages supports custom domains on the project it creates for you. Point your domain at the Pages project from your Cloudflare dashboard.",
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
          Free to build. Twenty dollars to go unlimited.
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed text-white/50">
          Build and download a complete website without paying anything. Upgrade when you want more
          projects and a live URL.
        </p>
      </header>

      <PricingPlans billingConfigured={isStripeConfigured()} />

      <section className="mt-24">
        <h2 className="mb-8 text-center text-[22px] font-semibold tracking-[-0.02em]">
          Compare plans
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-white/[0.09]">
                <th scope="col" className="py-3 text-left font-medium text-white/45">
                  Feature
                </th>
                <th scope="col" className="w-32 py-3 text-center font-medium text-white/45">
                  Free
                </th>
                <th scope="col" className="w-32 py-3 text-center font-medium text-white">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="border-b border-white/[0.06]">
                  <th scope="row" className="py-3 text-left font-normal text-white/70">
                    {row.feature}
                  </th>
                  <Cell value={row.free} />
                  <Cell value={row.pro} emphasis />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-[720px]">
        <h2 className="mb-8 text-center text-[22px] font-semibold tracking-[-0.02em]">
          Billing questions
        </h2>
        <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[15px] font-medium text-white/85 hover:text-white">
                {item.q}
                <span className="shrink-0 text-white/25 transition-transform duration-300 group-open:rotate-45">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-[14px] leading-relaxed text-white/45">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function Cell({ value, emphasis }: { value: string | boolean; emphasis?: boolean }) {
  if (typeof value === "boolean") {
    return (
      <td className="py-3 text-center">
        {value ? (
          <span className={emphasis ? "text-white" : "text-white/60"} aria-label="Included">
            ✓
          </span>
        ) : (
          <span className="text-white/15" aria-label="Not included">
            —
          </span>
        )}
      </td>
    );
  }
  return (
    <td className={`py-3 text-center ${emphasis ? "text-white" : "text-white/55"}`}>{value}</td>
  );
}
