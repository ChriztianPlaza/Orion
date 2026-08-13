import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px] opacity-70"
        style={{
          background: "radial-gradient(700px 340px at 50% -10%, rgba(41,151,255,0.18), transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div className="grid-bg mask-fade-b pointer-events-none absolute inset-x-0 top-0 h-[400px] opacity-30" aria-hidden="true" />

      <Link href="/" className="relative mb-10">
        <Wordmark />
      </Link>

      <main id="main" className="relative w-full max-w-[400px]">
        {children}
      </main>

      <p className="relative mt-10 text-center text-[12.5px] text-ink-dim">
        By continuing you agree that your projects are yours to download and host anywhere.
      </p>
    </div>
  );
}
