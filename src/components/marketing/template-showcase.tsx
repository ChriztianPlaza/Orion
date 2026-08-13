"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LivePreview, DeviceSwitcher, type Device } from "@/components/templates/live-preview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TemplateCard } from "@/lib/templates/queries";

/**
 * Landing-page showcase. Each tab renders the *actual* template in a sandboxed
 * frame — the same rendering path the marketplace and editor use, so what is on
 * the homepage is never a screenshot that drifts out of date.
 */
export function TemplateShowcase({ templates }: { templates: TemplateCard[] }) {
  const [active, setActive] = React.useState(0);
  const [device, setDevice] = React.useState<Device>("desktop");
  const [loaded, setLoaded] = React.useState(false);

  const current = templates[active];
  if (!current) return null;

  return (
    <div className="relative">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div
          className="scrollbar-none -mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1"
          role="tablist"
          aria-label="Featured templates"
        >
          {templates.map((template, index) => (
            <button
              key={template.slug}
              role="tab"
              aria-selected={index === active}
              onClick={() => {
                setActive(index);
                setLoaded(false);
              }}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition-all duration-300",
                index === active
                  ? "border-hairline-strong bg-white/10 text-white"
                  : "border-hairline text-ink-muted hover:border-hairline-strong hover:text-ink",
              )}
            >
              {template.name}
            </button>
          ))}
        </div>
        <DeviceSwitcher value={device} onChange={setDevice} />
      </div>

      <div className="card-surface relative overflow-hidden rounded-[14px]">
        <div
          className="pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-60 blur-3xl"
          style={{ background: "radial-gradient(60% 100% at 50% 100%, rgba(41,151,255,.25), transparent)" }}
          aria-hidden="true"
        />
        {!loaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#050505]">
            <span className="size-5 animate-spin rounded-full border-2 border-hairline-strong border-t-white/60" />
          </div>
        )}
        <LivePreview
          src={`/api/preview/${current.slug}`}
          device={device}
          title={`${current.name} preview`}
          className="h-[520px] w-full sm:h-[600px]"
          onLoad={() => setLoaded(true)}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{current.name}</p>
          <p className="mt-0.5 truncate text-[13px] text-ink-muted">{current.description}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/templates/${current.slug}`}>
            <Button variant="secondary" size="sm">
              Open details
            </Button>
          </Link>
          <Link href={`/templates/${current.slug}?use=1`}>
            <Button size="sm">
              Use this template <ArrowUpRight />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
