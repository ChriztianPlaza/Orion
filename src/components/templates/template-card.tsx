"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, MonitorSmartphone, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TemplateCard as TemplateCardData } from "@/lib/templates/queries";

/**
 * Marketplace card.
 *
 * The real template renders in a sandboxed frame with no hover and no scripted
 * trigger: the iframe is always in the markup and `loading="lazy"` lets the
 * browser fetch it as it approaches the viewport. An earlier version gated this
 * on IntersectionObserver, which silently never fires in contexts that are not
 * compositing frames — leaving the card stuck on its poster, which is exactly
 * the bug this is meant to avoid. The poster sits underneath until the document
 * paints, so there is never an empty box.
 */
export function TemplateCardItem({
  template,
  priority = false,
}: {
  template: TemplateCardData;
  priority?: boolean;
  /** Accepted for call-site symmetry; ordering no longer changes loading. */
  index?: number;
}) {
  const [ready, setReady] = React.useState(false);

  return (
    <article
      // content-visibility lets the browser skip layout, paint and compositing
      // for cards that are scrolled out of view. On a 24-card grid of live
      // previews that is the difference between smooth and unusable.
      className="card-surface group relative flex flex-col overflow-hidden rounded-[18px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] [contain-intrinsic-size:auto_420px] [content-visibility:auto] hover:-translate-y-1 hover:border-white/20"
    >
      <Link
        href={`/templates/${template.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-[#080808]"
        aria-label={`Open ${template.name}`}
      >
        {template.thumbnail ? (
          // Poster is an inline SVG generated with the template — no external
          // host, no layout shift, and it matches the template's real palette.
          <img
            src={template.thumbnail}
            alt=""
            loading={priority ? "eager" : "lazy"}
            className={cn(
              "size-full object-cover object-top transition-opacity duration-700",
              ready && "opacity-0",
            )}
          />
        ) : (
          <div
            className={cn(
              "flex size-full items-center justify-center bg-gradient-to-br from-white/[0.06] to-transparent transition-opacity duration-700",
              ready && "opacity-0",
            )}
          >
            <span className="text-[28px] font-semibold tracking-[-0.03em] text-white/15">
              {template.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        <iframe
          // `thumb=1` strips scripts, webfonts and full-size imagery — the card
          // shows the same thing at a fraction of the cost. With no script left
          // to run, the frame needs no sandbox permissions at all.
          src={`/api/preview/${template.slug}?thumb=1`}
          title={`${template.name} preview`}
          sandbox=""
          referrerPolicy="no-referrer"
          loading={priority ? "eager" : "lazy"}
          tabIndex={-1}
          aria-hidden="true"
          onLoad={() => setReady(true)}
          className={cn(
            "pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-white opacity-0 transition-opacity duration-500",
            ready && "opacity-100",
          )}
          style={{ width: "1280px", height: "900px", transform: "scale(0.3125)" }}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="absolute left-2.5 top-2.5 z-10 flex gap-1.5">
          {template.featured && (
            <Badge variant="solid" className="backdrop-blur">
              <Sparkles /> Featured
            </Badge>
          )}
          {template.tier === "PRO" && <Badge variant="brand">Pro</Badge>}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[14.5px] font-medium text-white">{template.name}</h3>
            <p className="mt-0.5 text-[12.5px] text-white/35">
              {template.categoryName ?? "Uncategorised"}
              {template.author ? ` · ${template.author}` : ""}
            </p>
          </div>
          {template.responsive && (
            <span
              className="mt-0.5 shrink-0 text-white/25"
              title="Responsive on every screen size"
              aria-label="Responsive"
            >
              <MonitorSmartphone className="size-4" />
            </span>
          )}
        </div>

        <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-white/40">
          {template.description}
        </p>

        {template.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/40"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2 pt-1">
          <Link href={`/templates/${template.slug}`} className="flex-1">
            <Button variant="secondary" size="sm" className="w-full">
              <Eye /> Preview
            </Button>
          </Link>
          <Link href={`/templates/${template.slug}?use=1`} className="flex-1">
            <Button size="sm" className="w-full">
              Use template
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}

export function TemplateCardSkeleton() {
  return (
    <div className="card-surface overflow-hidden rounded-[18px]">
      <div className="aspect-[4/3] animate-pulse bg-white/[0.04]" />
      <div className="space-y-2.5 p-4">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.04]" />
        <div className="h-3 w-full animate-pulse rounded bg-white/[0.04]" />
        <div className="flex gap-2 pt-2">
          <div className="h-8 flex-1 animate-pulse rounded-full bg-white/[0.05]" />
          <div className="h-8 flex-1 animate-pulse rounded-full bg-white/[0.05]" />
        </div>
      </div>
    </div>
  );
}
