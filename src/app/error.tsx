"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Users see a plain apology and a way forward —
 * never a stack trace. The digest identifies the entry in the server logs.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[app] unhandled error", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff453a]/10 text-[#ff6961]">
        <AlertTriangle className="size-5" />
      </span>
      <h1 className="text-balance-tight mt-6 text-[clamp(1.6rem,3.4vw,2.2rem)] font-semibold">
        Something went wrong
      </h1>
      <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-ink-muted">
        The page could not be loaded. Your work is saved — try again, and if it keeps happening
        please get in touch.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[12px] text-ink-dim">Reference: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
