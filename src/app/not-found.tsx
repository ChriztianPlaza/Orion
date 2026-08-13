import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Link href="/" className="mb-12">
        <Wordmark />
      </Link>
      <p className="font-mono text-[13px] text-ink-dim">404</p>
      <h1 className="text-balance-tight mt-4 text-[clamp(1.8rem,4vw,2.6rem)] font-semibold">
        This page does not exist
      </h1>
      <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-ink-muted">
        The link may be out of date, or the template or project may have been removed.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/templates">
          <Button>Browse templates</Button>
        </Link>
        <Link href="/">
          <Button variant="secondary">Go home</Button>
        </Link>
      </div>
    </div>
  );
}
