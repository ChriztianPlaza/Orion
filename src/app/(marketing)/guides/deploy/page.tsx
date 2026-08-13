import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, CircleAlert, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FREE_HOSTS, PAID_ROUTES, TROUBLESHOOTING } from "@/lib/guides/hosting";

export const metadata: Metadata = {
  title: "How to put your website online",
  description:
    "A step-by-step guide to hosting the website you built in Orion — free options that stay free, and what is worth paying for.",
  alternates: { canonical: "/guides/deploy" },
};

export default function DeployGuidePage() {
  return (
    <div className="container-page py-16 sm:py-24">
      {/* ────────────────────────────────────────────────────────────── intro */}
      <header className="mx-auto max-w-[60ch] text-center">
        <Badge variant="outline" className="mb-5">
          Guide
        </Badge>
        <h1 className="text-balance-tight text-[clamp(2.1rem,4.5vw,3.2rem)] font-semibold">
          How to put your website online
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed text-ink-muted">
          Orion gives you a folder of plain HTML, CSS and images. There is no build step and no
          server to run, which means any static host will take it — and several of them are free
          forever, not free for a trial.
        </p>
      </header>

      {/* ──────────────────────────────────────────────────────── before you start */}
      <section className="mx-auto mt-16 max-w-[720px]">
        <div className="card-surface rounded-[12px] p-6 sm:p-7">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Before you start</h2>
          <ol className="mt-4 space-y-3 text-[14.5px] leading-relaxed text-ink-muted">
            <Step n={1}>
              Open your website in the editor and click <strong className="text-white">Download</strong>. You
              get a <code className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[13px]">.zip</code> file.
            </Step>
            <Step n={2}>
              Unzip it. On Windows, right-click → Extract All. On a Mac, double-click it.
            </Step>
            <Step n={3}>
              Look inside. You should see{" "}
              <code className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[13px]">index.html</code> at the
              top level, next to a{" "}
              <code className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[13px]">style.css</code> and an{" "}
              <code className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[13px]">assets</code> folder. That
              folder is your entire website.
            </Step>
            <Step n={4}>
              Double-click <code className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[13px]">index.html</code>{" "}
              to check it opens correctly in your browser. What you see now is exactly what visitors
              will see.
            </Step>
          </ol>
          <p className="mt-5 border-t border-hairline pt-4 text-[13.5px] leading-relaxed text-ink-muted">
            Keep the folder structure exactly as it came. The links between the files are relative,
            so moving files around is the most common way to break a working site.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── free hosts */}
      <section className="mt-24" id="free">
        <div className="mx-auto max-w-[60ch] text-center">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em]">Free hosting</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
            All four are genuinely free for a site like yours, include HTTPS, and let you attach
            your own domain later. Start at the top — the list is ordered by effort.
          </p>
        </div>

        {/* comparison */}
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-hairline">
                <th scope="col" className="py-3 pr-4 text-left font-medium text-ink-muted">
                  Host
                </th>
                <th scope="col" className="w-28 py-3 text-center font-medium text-ink-muted">
                  Time
                </th>
                <th scope="col" className="w-28 py-3 text-center font-medium text-ink-muted">
                  Account
                </th>
                <th scope="col" className="w-28 py-3 text-center font-medium text-ink-muted">
                  Needs git
                </th>
                <th scope="col" className="py-3 pl-4 text-left font-medium text-ink-muted">
                  Free URL
                </th>
              </tr>
            </thead>
            <tbody>
              {FREE_HOSTS.map((host) => (
                <tr key={host.slug} className="border-b border-hairline">
                  <th scope="row" className="py-3 pr-4 text-left font-medium text-ink">
                    <a href={`#${host.slug}`} className="hover:text-white hover:underline">
                      {host.name}
                    </a>
                  </th>
                  <td className="py-3 text-center text-ink-muted">
                    {host.minutes.replace("about ", "~")}
                  </td>
                  <td className="py-3 text-center">
                    <Yes value={host.needsAccount} />
                  </td>
                  <td className="py-3 text-center">
                    <Yes value={host.needsGit} />
                  </td>
                  <td className="py-3 pl-4 text-ink-muted">
                    <code className="text-[13px]">{host.freeUrl}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* walkthroughs */}
        <div className="mt-12 space-y-5">
          {FREE_HOSTS.map((host, index) => (
            <article
              key={host.slug}
              id={host.slug}
              className="card-surface scroll-mt-24 rounded-[12px] p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-[19px] font-semibold tracking-[-0.01em]">{host.name}</h3>
                    {index === 0 && <Badge variant="success">Easiest</Badge>}
                    <Badge variant="outline">{host.minutes}</Badge>
                  </div>
                  <p className="mt-2 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-muted">
                    {host.pitch}
                  </p>
                </div>
                <a href={host.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <Button variant="secondary" size="sm">
                    Open {host.name} <ArrowRight />
                  </Button>
                </a>
              </div>

              <ol className="mt-6 space-y-3.5">
                {host.steps.map((step, stepIndex) => (
                  <li key={step} className="flex gap-3.5 text-[14.5px] leading-relaxed text-ink-muted">
                    <span className="mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full border border-hairline-strong text-[12px] font-medium text-ink-muted">
                      {stepIndex + 1}
                    </span>
                    <span className="min-w-0">{step}</span>
                  </li>
                ))}
              </ol>

              {host.watchOut && (
                <p className="mt-6 flex gap-3 rounded-xl border border-[#ff9f0a]/20 bg-[#ff9f0a]/[0.06] p-4 text-[13.5px] leading-relaxed text-ink-muted">
                  <CircleAlert className="mt-px size-4 shrink-0 text-[#ff9f0a]" />
                  <span className="min-w-0">{host.watchOut}</span>
                </p>
              )}

              <p className="mt-5 border-t border-hairline pt-4 text-[13.5px] leading-relaxed text-ink-muted">
                <span className="text-ink-muted">Custom domain:</span> {host.customDomain}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── paid routes */}
      <section className="mt-24" id="paid">
        <div className="mx-auto max-w-[60ch] text-center">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
            What is actually worth paying for
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
            Short version: buy a domain, keep the free hosting. Everything else is optional for a
            site like this one.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PAID_ROUTES.map((route, index) => (
            <article
              key={route.slug}
              id={route.slug}
              className="card-surface flex flex-col rounded-[12px] p-6 sm:p-7"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{route.name}</h3>
                {index === 0 && <Badge variant="success">Recommended</Badge>}
              </div>
              <p className="mt-1.5 text-[13.5px] font-medium text-ink">{route.cost}</p>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{route.pitch}</p>

              <ul className="mt-5 space-y-3 border-t border-hairline pt-5">
                {route.points.map((point) => (
                  <li key={point} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-muted">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-ink-dim" />
                    <span className="min-w-0">{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────── troubleshooting */}
      <section className="mx-auto mt-24 max-w-[720px]" id="troubleshooting">
        <h2 className="mb-8 text-center text-[22px] font-semibold tracking-[-0.02em]">
          When something goes wrong
        </h2>
        <div className="divide-y divide-hairline border-y border-hairline">
          {TROUBLESHOOTING.map((item) => (
            <details key={item.symptom} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[15px] font-medium text-ink hover:text-white">
                {item.symptom}
                <span className="shrink-0 text-ink-dim transition-transform duration-300 group-open:rotate-45">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M8 3v10M3 8h10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{item.fix}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────── cta */}
      <section className="mx-auto mt-24 max-w-[640px] text-center">
        <h2 className="text-[24px] font-semibold tracking-[-0.02em]">Need a site first?</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
          Pick a template, make it yours in the editor, and download it. Five projects on the free
          plan, no card required.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/templates">
            <Button size="lg">
              Browse templates <ArrowRight />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary">
              Go to my websites
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full border border-hairline-strong text-[12px] font-medium text-ink-muted">
        {n}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function Yes({ value }: { value: boolean }) {
  return value ? (
    <Check className="mx-auto size-4 text-ink-muted" aria-label="Yes" />
  ) : (
    <Minus className="mx-auto size-4 text-ink-faint" aria-label="No" />
  );
}
