import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  Download,
  Gauge,
  Globe,
  Layers,
  MousePointerClick,
  PanelsTopLeft,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryStrip } from "@/components/marketing/category-strip";
import { TemplateShowcase } from "@/components/marketing/template-showcase";
import { PricingPlans } from "@/components/billing/pricing-plans";
import { listCategories, listFeaturedTemplates } from "@/lib/templates/queries";
import { isStripeConfigured } from "@/lib/env";
import { bundledTemplateCount } from "@/generated/templates";

export const revalidate = 300;

const STEPS = [
  {
    icon: PanelsTopLeft,
    title: "Browse the marketplace",
    body: "Filter by category, style and colour. Every card renders the real website, not a screenshot that stopped being accurate months ago.",
  },
  {
    icon: MousePointerClick,
    title: "Click anything to edit it",
    body: "Headlines, paragraphs, images, buttons, links, colours and fonts. Click the thing on the page and change it in the panel beside it.",
  },
  {
    icon: Gauge,
    title: "Preview at every size",
    body: "Desktop, tablet and phone — rendered at real device widths, so the media queries behave exactly as they will once it is live.",
  },
  {
    icon: Rocket,
    title: "Download and publish",
    body: "Take a ZIP of plain HTML, CSS and JavaScript, then drop the folder on any free host. The guide walks through four of them.",
  },
];

const FEATURES = [
  {
    icon: Layers,
    title: "Real files, not a proprietary runtime",
    body: "What you download is what runs. No scripts phoning home, no build step, no platform to keep paying for once you have shipped.",
    wide: true,
  },
  {
    icon: Blocks,
    title: "Multi-page projects",
    body: "Templates with about and contact pages stay multi-page all the way through the editor and the export.",
  },
  {
    icon: ShieldCheck,
    title: "Sandboxed previews",
    body: "Template code runs in an isolated origin. It cannot read your session, your account or anything else on the page.",
  },
  {
    icon: Download,
    title: "Version history and autosave",
    body: "Every change is saved as you make it, with named versions you can roll back to.",
  },
  {
    icon: Globe,
    title: "Host it anywhere, free",
    body: "The export is a plain folder, which every static host accepts. Our guide covers Netlify, Cloudflare Pages, GitHub Pages and Vercel — all free forever, all with your own domain if you want one.",
    wide: true,
  },
];

const FAQ = [
  {
    q: "Do I actually own the website I build?",
    a: "Yes. Every project exports as ordinary HTML, CSS and JavaScript with no dependency on Orion. Host it anywhere, edit it in any editor, and keep it forever.",
  },
  {
    q: "What is the difference between Free and Pro?",
    a: "Free gives you five projects, the full editor, unlimited previews and five downloads a month. Pro raises that to 50 projects and 50 downloads a week, and unlocks the premium and animated templates. Hosting is free either way — you host the exported files yourself.",
  },
  {
    q: "Do I need to know how to code?",
    a: "No. The editor works by clicking things on the page. If you do write code, the exported files are clean and readable — there is no generated soup to untangle.",
  },
  {
    q: "Where are the templates from?",
    a: "The bundled library is designed and written for Orion and released under the MIT license. Imported templates keep their original license, author and attribution, which is shown on every template page.",
  },
  {
    q: "Can I use my own images?",
    a: "Yes. Upload them in the editor, or point at a URL. Uploaded images are bundled into your download so the exported site is fully self-contained.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes — Pro is billed monthly through Stripe and you can cancel from the billing portal in two clicks. Your projects stay in your account.",
  },
];

export default async function LandingPage() {
  const [featured, categories] = await Promise.all([
    listFeaturedTemplates(6),
    listCategories(),
  ]);

  const templateCount = Math.max(bundledTemplateCount, categories.reduce((sum, c) => sum + c.count, 0));

  return (
    <>
      {/* ─────────────────────────────────────────────────────────── hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[620px] opacity-70"
          style={{
            background:
              "radial-gradient(900px 420px at 50% -10%, rgba(71,163,255,0.22), transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div className="grid-bg mask-fade-b pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-40" aria-hidden="true" />

        <div className="container-page relative pb-16 pt-20 sm:pt-28">
          <div className="grid items-end gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
            <h1 className="text-balance-tight animate-fade-up text-[clamp(2.7rem,6.4vw,5.1rem)] font-semibold leading-[0.98]">
              <span className="text-gradient">Choose a template.</span>
              <br />
              <span className="text-gradient">Make it yours.</span>{" "}
              <span className="text-ink-muted">Ship it.</span>
            </h1>

            <div className="animate-fade-up [animation-delay:120ms]">
              <p className="max-w-[46ch] text-[17px] leading-relaxed text-ink-muted">
                A library of production-ready templates, a visual editor that works by clicking the
                page, and a download you can put on any host for free. The files stay plain HTML,
                CSS and JavaScript — yours to take anywhere.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/templates">
                  <Button size="lg">
                    Browse templates <ArrowRight />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline">
                    See pricing
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-[13px] text-ink-dim">
                Free plan, no card required. Five websites and five downloads a month.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────── categories */}
      <section className="border-y border-hairline bg-white/[0.015]">
        <div className="container-page py-6">
          <CategoryStrip categories={categories} />
        </div>
      </section>

      {/* ────────────────────────────────────────────────────── showcase */}
      <section className="container-page py-20 sm:py-28" id="showcase">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-3 text-[13px] font-medium uppercase tracking-[0.16em] text-ink-dim">
              Live, not screenshots
            </p>
            <h2 className="text-balance-tight max-w-[20ch] text-[clamp(1.9rem,3.6vw,2.9rem)] font-semibold">
              Every template renders as the real website
            </h2>
          </div>
          <Link href="/templates">
            <Button variant="secondary">
              All {templateCount} templates <ArrowRight />
            </Button>
          </Link>
        </div>

        {featured.length > 0 && <TemplateShowcase templates={featured} />}
      </section>

      {/* ─────────────────────────────────────────────────── how it works */}
      <section id="how" className="border-t border-hairline py-20 sm:py-28">
        <div className="container-page">
          <div className="mb-14 max-w-[52ch]">
            <p className="mb-3 text-[13px] font-medium uppercase tracking-[0.16em] text-ink-dim">
              How it works
            </p>
            <h2 className="text-balance-tight text-[clamp(1.9rem,3.6vw,2.9rem)] font-semibold">
              Four steps between an idea and a live website
            </h2>
          </div>

          <ol className="grid gap-px overflow-hidden rounded-[14px] border border-hairline bg-white/[0.06] md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="group bg-black p-7 transition-colors hover:bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] text-ink transition-colors group-hover:bg-white/10 group-hover:text-white">
                    <step.icon className="size-4" />
                  </span>
                  <span className="font-mono text-xs text-ink-dim">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-[15px] font-medium">{step.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────── features */}
      <section id="features" className="border-t border-hairline py-20 sm:py-28">
        <div className="container-page">
          <div className="mb-14 max-w-[52ch]">
            <p className="mb-3 text-[13px] font-medium uppercase tracking-[0.16em] text-ink-dim">
              What you get
            </p>
            <h2 className="text-balance-tight text-[clamp(1.9rem,3.6vw,2.9rem)] font-semibold">
              Built like a tool you would keep using
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className={`card-surface group rounded-[14px] p-7 transition-all duration-500 hover:border-hairline-strong ${
                  feature.wide ? "lg:col-span-2" : ""
                }`}
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/[0.06] text-ink transition-colors group-hover:text-white">
                  <feature.icon className="size-[18px]" />
                </span>
                <h3 className="mt-6 text-[16px] font-medium">{feature.title}</h3>
                <p className="mt-2 max-w-[54ch] text-[14px] leading-relaxed text-ink-muted">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── pricing */}
      <section id="pricing" className="border-t border-hairline py-20 sm:py-28">
        <div className="container-page">
          <div className="mx-auto mb-14 max-w-[52ch] text-center">
            <p className="mb-3 text-[13px] font-medium uppercase tracking-[0.16em] text-ink-dim">
              Pricing
            </p>
            <h2 className="text-balance-tight text-[clamp(1.9rem,3.6vw,2.9rem)] font-semibold">
              Start free. Upgrade when you outgrow it.
            </h2>
          </div>

          {/* Same component as /pricing so the two can never drift apart. */}
          <PricingPlans billingConfigured={isStripeConfigured()} />

          <p className="mt-6 text-center text-[13px] text-ink-dim">
            Payments handled by Stripe. Cancel any time from the billing portal.
          </p>
        </div>
      </section>


      {/* ────────────────────────────────────────────────────────────── faq */}
      <section id="faq" className="border-t border-hairline py-20 sm:py-28">
        <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-3 text-[13px] font-medium uppercase tracking-[0.16em] text-ink-dim">
              Questions
            </p>
            <h2 className="text-balance-tight text-[clamp(1.9rem,3.6vw,2.6rem)] font-semibold">
              Everything else
            </h2>
          </div>

          <div className="divide-y divide-hairline border-y border-hairline">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[15px] font-medium text-ink transition-colors hover:text-white">
                  {item.q}
                  <span className="shrink-0 text-ink-dim transition-transform duration-300 group-open:rotate-45">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 max-w-[66ch] text-[14px] leading-relaxed text-ink-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────── cta */}
      <section className="border-t border-hairline">
        <div className="container-page py-24 sm:py-32">
          <div className="relative overflow-hidden rounded-[14px] border border-hairline bg-gradient-to-b from-white/[0.05] to-transparent px-8 py-16 text-center sm:px-16">
            <div
              className="pointer-events-none absolute inset-x-0 -bottom-32 h-64 opacity-60 blur-3xl"
              style={{ background: "radial-gradient(50% 100% at 50% 0%, rgba(41,151,255,.35), transparent)" }}
              aria-hidden="true"
            />
            <Sparkles className="mx-auto size-5 text-ink-dim" />
            <h2 className="text-balance-tight mx-auto mt-6 max-w-[20ch] text-[clamp(2rem,4vw,3.2rem)] font-semibold">
              Your website is about ten minutes away
            </h2>
            <p className="mx-auto mt-5 max-w-[48ch] text-[15px] leading-relaxed text-ink-muted">
              Pick a template, change the words, drop in your images and ship. You can always take
              the files and go.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/templates">
                <Button size="lg">
                  Start building <ArrowRight />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">
                  Compare plans
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
