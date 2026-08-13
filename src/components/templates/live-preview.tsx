"use client";

import * as React from "react";
import { Monitor, Tablet, Smartphone, RotateCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Device = "desktop" | "tablet" | "mobile";

export const DEVICE_WIDTHS: Record<Device, number> = {
  desktop: 1440,
  tablet: 834,
  mobile: 390,
};

const DEVICE_ICONS = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
} as const;

/**
 * Renders a template or project inside a scaled, sandboxed iframe.
 *
 * The iframe is scaled rather than resized so the page inside always believes
 * it is on a real device width — media queries behave exactly as they will in
 * the exported site. The `sandbox` attribute deliberately omits
 * `allow-same-origin`: template JavaScript runs, but in an opaque origin with
 * no access to Orion cookies, storage or DOM.
 */
export function LivePreview({
  src,
  device = "desktop",
  className,
  title,
  interactive = true,
  onLoad,
}: {
  src: string;
  device?: Device;
  className?: string;
  title: string;
  interactive?: boolean;
  onLoad?: () => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const [height, setHeight] = React.useState(900);
  const width = DEVICE_WIDTHS[device];

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      if (!rect.width) return;
      setScale(Math.min(1, rect.width / width));
      setHeight(rect.height || 900);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);

  return (
    // `min-w-0` + `contain` stop the 1440px-wide iframe inside from widening
    // any flex/grid track this sits in.
    <div
      ref={containerRef}
      className={cn("relative min-w-0 overflow-hidden bg-[#050505] [contain:layout_paint]", className)}
    >
      <iframe
        key={src}
        src={src}
        title={title}
        loading="lazy"
        onLoad={onLoad}
        sandbox="allow-scripts allow-popups allow-forms allow-modals"
        referrerPolicy="no-referrer"
        className={cn(
          "origin-top-left border-0 bg-white transition-[width,height] duration-300",
          !interactive && "pointer-events-none",
        )}
        style={{
          width: `${width}px`,
          height: `${scale > 0 ? height / scale : height}px`,
          transform: `scale(${scale})`,
        }}
      />
    </div>
  );
}

export function DeviceSwitcher({
  value,
  onChange,
  className,
}: {
  value: Device;
  onChange: (device: Device) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-0.5 rounded-full border border-hairline bg-white/[0.04] p-0.5", className)}
      role="group"
      aria-label="Preview size"
    >
      {(Object.keys(DEVICE_WIDTHS) as Device[]).map((device) => {
        const Icon = DEVICE_ICONS[device];
        const active = value === device;
        return (
          <button
            key={device}
            type="button"
            onClick={() => onChange(device)}
            aria-pressed={active}
            title={`${device[0].toUpperCase()}${device.slice(1)} — ${DEVICE_WIDTHS[device]}px`}
            className={cn(
              "flex size-7 items-center justify-center rounded-full transition-all duration-300",
              active ? "bg-white text-black" : "text-ink-muted hover:bg-white/[0.06] hover:text-white",
            )}
          >
            <Icon className="size-3.5" />
            <span className="sr-only">{device}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Full-height preview surface with a browser-style chrome bar. */
export function PreviewFrame({
  src,
  title,
  label,
  className,
  initialDevice = "desktop",
  showOpenInNewTab = true,
}: {
  src: string;
  title: string;
  label?: string;
  className?: string;
  initialDevice?: Device;
  showOpenInNewTab?: boolean;
}) {
  const [device, setDevice] = React.useState<Device>(initialDevice);
  const [nonce, setNonce] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const source = nonce ? `${src}${src.includes("?") ? "&" : "?"}r=${nonce}` : src;

  return (
    <div className={cn("card-surface flex flex-col overflow-hidden rounded-[14px]", className)}>
      <div className="flex items-center gap-3 border-b border-hairline bg-white/[0.02] px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-white/12" />
          <span className="size-2.5 rounded-full bg-white/12" />
          <span className="size-2.5 rounded-full bg-white/12" />
        </div>
        <div className="mx-auto flex min-w-0 max-w-[420px] flex-1 items-center justify-center">
          <span className="truncate rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-ink-muted">
            {label ?? title}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <DeviceSwitcher value={device} onChange={setDevice} />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setLoading(true);
              setNonce((value) => value + 1);
            }}
            title="Reload preview"
          >
            <RotateCw />
            <span className="sr-only">Reload preview</span>
          </Button>
          {showOpenInNewTab && (
            <a href={src} target="_blank" rel="noopener noreferrer" title="Open in a new tab">
              <Button variant="ghost" size="icon-sm">
                <ExternalLink />
                <span className="sr-only">Open preview in a new tab</span>
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#050505]">
            <span className="size-5 animate-spin rounded-full border-2 border-hairline-strong border-t-white/70" />
          </div>
        )}
        <LivePreview
          src={source}
          device={device}
          title={title}
          className="h-full w-full"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}
