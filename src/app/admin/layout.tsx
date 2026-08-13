import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { AppHeader } from "@/components/app/app-header";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/activity", label: "Activity" },
];

/**
 * Admin is protected here, on the server, for every route beneath it. Hiding
 * the link in the header is presentation only — this is the control.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({
    where: { id: admin.id },
    select: { name: true, email: true, image: true, plan: true, role: true },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        user={
          user ?? {
            name: admin.name,
            email: admin.email,
            image: admin.image,
            plan: admin.plan,
            role: admin.role,
          }
        }
      />

      <div className="border-b border-hairline">
        <nav className="container-page scrollbar-none flex gap-1 overflow-x-auto py-2" aria-label="Admin sections">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-[13.5px] text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      <main id="main" className="flex-1 pb-20">
        {children}
      </main>
    </div>
  );
}
