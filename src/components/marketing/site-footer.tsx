import Link from "next/link";
import { Wordmark } from "@/components/brand";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/templates", label: "Templates" },
      { href: "/pricing", label: "Pricing" },
      { href: "/guides/deploy", label: "Hosting guide" },
      { href: "/#how", label: "How it works" },
    ],
  },
  {
    title: "Categories",
    links: [
      { href: "/templates?category=saas", label: "SaaS" },
      { href: "/templates?category=portfolio", label: "Portfolio" },
      { href: "/templates?category=restaurant", label: "Restaurant" },
      { href: "/templates?category=ecommerce", label: "E-commerce" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/register", label: "Create account" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/account", label: "Billing" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-black">
      <div className="container-page py-16">
        <div className="grid gap-12 md:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-ink-muted">
              A template library, a visual editor and a static site generator. Build a real website,
              then take the files with you.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-[13px] font-medium text-white">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] text-ink-muted transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-hairline pt-7 text-[13px] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Orion. All rights reserved.</p>
          <p>
            Templates ship as plain HTML, CSS and JavaScript — no runtime, no lock-in.
          </p>
        </div>
      </div>
    </footer>
  );
}
