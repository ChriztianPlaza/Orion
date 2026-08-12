"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/templates", label: "Templates" },
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        scrolled ? "glass border-b" : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link href="/" aria-label="Orion home" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-1.5 text-[13.5px] text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {status === "loading" ? (
            <div className="h-8 w-32 animate-pulse rounded-full bg-white/[0.06]" />
          ) : session?.user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Link href="/templates">
                <Button size="sm">New website</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="-mr-2 rounded-lg p-2 text-white/70 transition-colors hover:bg-white/5 hover:text-white md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="glass border-t md:hidden">
          <nav className="container-page flex flex-col py-3" aria-label="Mobile">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="border-b border-white/[0.06] py-3 text-[15px] text-white/75 last:border-0"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex gap-2 pb-2">
              {session?.user ? (
                <>
                  <Link href="/dashboard" className="flex-1">
                    <Button variant="secondary" className="w-full">
                      Dashboard
                    </Button>
                  </Link>
                  <Link href="/templates" className="flex-1">
                    <Button className="w-full">New website</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="flex-1">
                    <Button variant="secondary" className="w-full">
                      Log in
                    </Button>
                  </Link>
                  <Link href="/register" className="flex-1">
                    <Button className="w-full">Get started</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
