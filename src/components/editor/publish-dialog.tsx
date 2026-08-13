"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FREE_HOSTS } from "@/lib/guides/hosting";

/**
 * Shown after a download, and from the editor's Publish button.
 *
 * Orion does not host anything — the export is a plain folder of files, so the
 * useful thing to hand the user is the shortest path from that folder to a live
 * URL. The full walkthrough lives at /guides/deploy; this is the summary.
 */
export function PublishDialog({
  open,
  onClose,
  projectName,
}: {
  open: boolean;
  onClose: () => void;
  projectName: string;
}) {
  const [primary, ...alternatives] = FREE_HOSTS;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Put your website online"
      description={
        <>
          <strong className="text-ink">{projectName}</strong> downloads as a folder of plain
          HTML and CSS. Any static host will take it, and these ones are free forever.
        </>
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Later
          </Button>
          <Link href="/guides/deploy" target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">
              Read the full guide <ArrowRight />
            </Button>
          </Link>
        </>
      }
    >
      <div className="rounded-[12px] border border-hairline bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-[15.5px] font-semibold">{primary.name}</h3>
          <Badge variant="success">Fastest</Badge>
          <Badge variant="outline">{primary.minutes}</Badge>
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{primary.pitch}</p>

        <ol className="mt-4 space-y-2.5">
          {primary.steps.slice(0, 4).map((step, index) => (
            <li key={step} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-muted">
              <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full border border-hairline-strong text-[11px] font-medium text-ink-muted">
                {index + 1}
              </span>
              <span className="min-w-0">{step}</span>
            </li>
          ))}
        </ol>

        <a
          href={primary.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block"
        >
          <Button size="sm">
            Open {primary.name} <ArrowUpRight />
          </Button>
        </a>
      </div>

      <div className="mt-5">
        <p className="text-[12.5px] font-medium uppercase tracking-wide text-ink-dim">
          Other free options
        </p>
        <ul className="mt-3 space-y-1.5">
          {alternatives.map((host) => (
            <li key={host.slug}>
              <Link
                href={`/guides/deploy#${host.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-4 rounded-xl px-3 py-2 text-[13.5px] text-ink-muted transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium text-ink">{host.name}</span>
                  <span className="text-ink-muted"> — {host.freeUrl}</span>
                </span>
                <span className="shrink-0 text-[12.5px] text-ink-dim">
                  {host.minutes.replace("about ", "~")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
