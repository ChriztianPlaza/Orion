"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChevronDown, LayoutGrid, LogOut, Settings, Shield, Sparkles } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, initials } from "@/lib/utils";
import type { Plan, Role } from "@prisma/client";

const LINKS = [
  { href: "/dashboard", label: "Websites" },
  { href: "/templates", label: "Templates" },
  { href: "/account", label: "Account" },
];

export function AppHeader({
  user,
}: {
  user: { name: string | null; email: string; image: string | null; plan: Plan; role: Role };
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  React.useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header className="glass sticky top-0 z-50 border-b">
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" aria-label="Dashboard">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Application">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[13.5px] transition-colors",
                  pathname === link.href
                    ? "bg-white/[0.08] text-white"
                    : "text-white/50 hover:bg-white/[0.05] hover:text-white",
                )}
              >
                {link.label}
              </Link>
            ))}
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px] transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-white/[0.08] text-white"
                    : "text-white/50 hover:bg-white/[0.05] hover:text-white",
                )}
              >
                <Shield className="size-3.5" /> Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          {user.plan === "FREE" && (
            <Link href="/pricing" className="hidden sm:block">
              <Button size="sm" variant="secondary">
                <Sparkles /> Upgrade
              </Button>
            </Link>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-white/[0.06]"
            >
              <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-white/10 text-[11px] font-semibold text-white">
                {user.image ? (
                  <img src={user.image} alt="" className="size-full object-cover" />
                ) : (
                  initials(user.name, user.email)
                )}
              </span>
              <ChevronDown className="size-3.5 text-white/35" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="glass absolute right-0 top-[calc(100%+8px)] w-60 overflow-hidden rounded-2xl p-1.5 shadow-[0_30px_80px_-30px_rgba(0,0,0,1)]"
              >
                <div className="border-b border-white/[0.07] px-3 pb-3 pt-2">
                  <p className="truncate text-[13px] font-medium text-white">
                    {user.name || user.email.split("@")[0]}
                  </p>
                  <p className="truncate text-[12px] text-white/35">{user.email}</p>
                  <Badge variant={user.plan === "PRO" ? "brand" : "outline"} className="mt-2">
                    {user.plan === "PRO" ? "Pro plan" : "Free plan"}
                  </Badge>
                </div>

                <MenuLink href="/dashboard" icon={LayoutGrid}>
                  My websites
                </MenuLink>
                <MenuLink href="/account" icon={Settings}>
                  Account and billing
                </MenuLink>
                {user.role === "ADMIN" && (
                  <MenuLink href="/admin" icon={Shield}>
                    Admin dashboard
                  </MenuLink>
                )}

                <button
                  role="menuitem"
                  onClick={() => void signOut({ callbackUrl: "/" })}
                  className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof LayoutGrid;
  children: React.ReactNode;
}) {
  return (
    <Link
      role="menuitem"
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}
