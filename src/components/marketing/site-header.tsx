"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MenuLink = { href: string; label: string };

type Menu = {
  id: string;
  label: string;
  /** Heading of the panel's left column. */
  title: string;
  description: string;
  cta: MenuLink;
  links: MenuLink[];
};

const MENUS: Menu[] = [
  {
    id: "templates",
    label: "Templates",
    title: "Templates",
    description:
      "Production-ready designs, every one editable in the browser and yours to download.",
    cta: { href: "/templates", label: "Browse all templates" },
    links: [
      { href: "/templates?category=saas", label: "SaaS" },
      { href: "/templates?category=portfolio", label: "Portfolio" },
      { href: "/templates?category=restaurant", label: "Restaurant" },
      { href: "/templates?category=ecommerce", label: "E-commerce" },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    title: "Resources",
    description: "Everything between picking a template and having a live URL.",
    cta: { href: "/guides/deploy", label: "Read the hosting guide" },
    links: [
      { href: "/#how", label: "How it works" },
      { href: "/guides/deploy", label: "Hosting guide" },
      { href: "/#features", label: "Features" },
      { href: "/#faq", label: "Questions" },
    ],
  },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const navRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Any navigation closes everything.
  React.useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  // Escape closes the panel; a click anywhere outside the nav does too.
  React.useEffect(() => {
    if (!openMenu) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenMenu(null);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openMenu]);

  /*
   * Hover opens the panel only where hovering is a real gesture. On touch the
   * `pointerenter` fires as part of the tap, which would open and immediately
   * re-toggle the panel; click is the interaction everywhere.
   */
  const hoverOpen = (id: string) => {
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
      setOpenMenu(id);
    }
  };

  /*
   * Closing is deferred by a beat.
   *
   * The pointer has to cross the gap between the trigger and the panel, and for
   * that moment it is over neither of them. Closing on the first `pointerleave`
   * meant the menu vanished mid-journey and could never be reached. The panel
   * also carries its own padding bridge across that gap — this delay covers the
   * diagonal shortcut people take towards a link on the far side.
   */
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = React.useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenMenu(null), 180);
  }, [cancelClose]);

  React.useEffect(() => cancelClose, [cancelClose]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled || openMenu ? "glass border-b" : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-page flex h-16 items-center gap-6">
        {/* ─────────────────────────────────────────────── left: sectioned nav */}
        <div
          ref={navRef}
          className="hidden flex-1 items-center gap-1 md:flex"
          onPointerEnter={cancelClose}
          onPointerLeave={scheduleClose}
        >
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-2"
          >
            Home
          </Link>

          {MENUS.map((menu) => (
            <div
              key={menu.id}
              className="relative"
              onPointerEnter={() => {
                cancelClose();
                hoverOpen(menu.id);
              }}
            >
              <button
                type="button"
                aria-expanded={openMenu === menu.id}
                aria-haspopup="true"
                aria-controls={`menu-${menu.id}`}
                onClick={() => setOpenMenu((current) => (current === menu.id ? null : menu.id))}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13.5px] font-medium transition-colors",
                  openMenu === menu.id
                    ? "bg-surface-2 text-ink"
                    : "text-ink hover:bg-surface-2",
                )}
              >
                {menu.label}
                <ChevronDown
                  className={cn(
                    "size-3.5 text-ink-dim transition-transform duration-200",
                    openMenu === menu.id && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>

              {openMenu === menu.id && <MenuPanel id={`menu-${menu.id}`} menu={menu} />}
            </div>
          ))}
        </div>

        {/* ────────────────────────────────────────────────── centre: wordmark */}
        <Link
          href="/"
          aria-label="Orion home"
          className="shrink-0 md:absolute md:left-1/2 md:-translate-x-1/2"
        >
          <Wordmark />
        </Link>

        {/* ───────────────────────────────────────────────────── right: actions */}
        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link
            href="/pricing"
            className="rounded-md px-2 py-1.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-2"
          >
            Pricing
          </Link>

          <span className="h-5 w-px bg-hairline" aria-hidden="true" />

          {status === "loading" ? (
            <div className="h-8 w-40 animate-pulse rounded-full bg-surface-2" />
          ) : session?.user ? (
            <>
              <Link href="/dashboard">
                <Button variant="secondary" size="sm">
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
                <Button variant="secondary" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="-mr-2 ml-auto rounded-lg p-2 text-ink transition-colors hover:bg-surface-2 md:hidden"
          onClick={() => setMobileOpen((value) => !value)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen && <MobileNav session={Boolean(session?.user)} />}
    </header>
  );
}

/** The dropdown: a description and CTA on the left, destinations on the right. */
function MenuPanel({ id, menu }: { id: string; menu: Menu }) {
  return (
    /*
     * The wrapper starts flush against the trigger (`top-full`) and creates the
     * visual gap with its own top padding. That padding is part of the panel's
     * box, so the pointer never crosses dead space on its way down.
     */
    <div id={id} className="absolute left-0 top-full z-50 w-[520px] pt-2.5">
      <div className="glass animate-fade-in rounded-[14px] p-5 shadow-[var(--shadow-overlay)]">
        <div className="grid grid-cols-[1fr_1fr] gap-6">
          <div className="flex flex-col">
            <p className="text-[15px] font-semibold text-ink">{menu.title}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{menu.description}</p>
            <Link href={menu.cta.href} className="mt-auto pt-5">
              <Button size="sm" className="w-full">
                {menu.cta.label}
              </Button>
            </Link>
          </div>

          <ul className="space-y-0.5">
            {menu.links.map((link) => (
              <li key={link.href + link.label}>
                <Link
                  href={link.href}
                  className="group flex items-center justify-between gap-4 rounded-md px-3 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-2"
                >
                  {link.label}
                  <ArrowRight
                    className="size-3.5 text-ink-dim transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MobileNav({ session }: { session: boolean }) {
  return (
    <div className="glass border-t md:hidden">
      <nav className="container-page flex flex-col py-3" aria-label="Mobile">
        <Link href="/" className="border-b border-hairline py-3 text-[15px] text-ink">
          Home
        </Link>

        {MENUS.map((menu) => (
          <div key={menu.id} className="border-b border-hairline py-3">
            <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-ink-dim">
              {menu.title}
            </p>
            <ul className="mt-2 space-y-1">
              {[menu.cta, ...menu.links].map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="block py-1.5 text-[15px] text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <Link href="/pricing" className="border-b border-hairline py-3 text-[15px] text-ink">
          Pricing
        </Link>

        <div className="mt-4 flex gap-2 pb-2">
          {session ? (
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
                  Sign in
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
  );
}
