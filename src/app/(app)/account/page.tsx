import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Download, Heart, LayoutGrid } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/guards";
import { limitsFor, PLAN_COPY } from "@/lib/plans";
import { isStripeConfigured } from "@/lib/env";
import { FREE_HOSTS } from "@/lib/guides/hosting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BillingPortalButton } from "@/components/billing/billing-portal-button";
import { formatBytes, formatDate, relativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login?next=%2Faccount");

  const [user, subscription, downloads, favorites, projectCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        name: true,
        email: true,
        plan: true,
        downloadCount: true,
        createdAt: true,
        stripeCustomerId: true,
      },
    }),
    prisma.subscription.findFirst({
      where: { userId: sessionUser.id, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
      orderBy: { createdAt: "desc" },
      select: { status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
    }),
    prisma.download.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, createdAt: true, bytes: true, fileCount: true, project: { select: { name: true } } },
    }),
    prisma.favorite.count({ where: { userId: sessionUser.id } }),
    prisma.project.count({ where: { userId: sessionUser.id } }),
  ]);

  if (!user) redirect("/login");

  const limits = limitsFor(user.plan);
  const billingEnabled = isStripeConfigured();
  const copy = PLAN_COPY[user.plan];

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-[clamp(1.7rem,3vw,2.3rem)] font-semibold tracking-[-0.025em]">Account</h1>
        <p className="mt-2 text-[14.5px] text-ink-muted">
          {user.email} · member since {formatDate(user.createdAt)}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="card-surface rounded-[14px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-[17px] font-semibold">{copy.name} plan</h2>
                <Badge variant={user.plan === "PRO" ? "brand" : "outline"}>
                  {user.plan === "PRO" ? "Active" : "$0 / forever"}
                </Badge>
              </div>
              <p className="mt-2 max-w-[46ch] text-[14px] text-ink-muted">{copy.tagline}</p>

              {subscription && (
                <p className="mt-3 text-[13px] text-ink-muted">
                  {subscription.cancelAtPeriodEnd
                    ? `Cancels on ${subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "the end of the period"}.`
                    : subscription.currentPeriodEnd
                      ? `Renews on ${formatDate(subscription.currentPeriodEnd)}.`
                      : null}
                  {subscription.status === "PAST_DUE" && (
                    <span className="ml-1 text-[#ffd60a]">
                      Payment failed — update your card to keep Pro.
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {user.plan === "PRO" ? (
                <BillingPortalButton />
              ) : (
                <Link href="/pricing">
                  <Button variant={billingEnabled ? "primary" : "secondary"}>
                    {billingEnabled ? "Upgrade to Pro" : "See plans"}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <dl className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Usage
              icon={<LayoutGrid className="size-4" />}
              label="Websites"
              used={projectCount}
              max={limits.maxProjects}
            />
            <Usage
              icon={<Download className="size-4" />}
              label="Downloads"
              used={user.downloadCount}
              max={limits.maxDownloads}
            />
            {/* No image meter: uploads are released on download, so a usage
                bar here would read as an allowance the plan does not sell. */}
            <Usage
              icon={<Heart className="size-4" />}
              label="Favourites"
              used={favorites}
              max={Number.POSITIVE_INFINITY}
            />
          </dl>
        </section>

        <section className="card-surface rounded-[14px] p-6">
          <h2 className="text-[15px] font-semibold">What Pro adds</h2>
          <ul className="mt-4 space-y-2.5">
            {PLAN_COPY.PRO.features.slice(0, 6).map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-[13.5px] text-ink-muted">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-white/30" />
                {feature}
              </li>
            ))}
          </ul>
          {user.plan === "FREE" && (
            <Link href="/pricing" className="mt-6 block">
              <Button variant="secondary" className="w-full">
                See full comparison
              </Button>
            </Link>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card-surface rounded-[14px] p-6">
          <h2 className="text-[15px] font-semibold">Recent downloads</h2>
          {downloads.length === 0 ? (
            <p className="mt-4 text-[13.5px] text-ink-muted">
              No downloads yet. Open a project and choose Download to get the files.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline">
              {downloads.map((download) => (
                <li key={download.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] text-ink">
                      {download.project?.name ?? "Deleted project"}
                    </p>
                    <p className="text-[12px] text-ink-dim">
                      {download.fileCount} files · {formatBytes(download.bytes)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] text-ink-dim">
                    {relativeTime(download.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-surface rounded-[14px] p-6">
          <h2 className="text-[15px] font-semibold">Putting a site online</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
            Orion exports plain HTML and CSS, so hosting it costs nothing. These hosts are free
            forever and take the folder as-is.
          </p>
          <ul className="mt-4 divide-y divide-hairline">
            {FREE_HOSTS.map((host) => (
              <li key={host.slug}>
                <Link
                  href={`/guides/deploy#${host.slug}`}
                  className="flex items-center justify-between gap-4 py-2.5 text-[13.5px] text-ink-muted transition-colors hover:text-white"
                >
                  <span className="min-w-0 truncate">
                    <span className="text-ink">{host.name}</span>
                    <span className="text-ink-dim"> — {host.freeUrl}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-ink-dim">
                    {host.minutes.replace("about ", "~")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/guides/deploy" className="mt-5 block">
            <Button variant="secondary" className="w-full">
              Read the hosting guide <ArrowRight />
            </Button>
          </Link>
        </section>
      </div>
    </div>
  );
}

function Usage({
  icon,
  label,
  used,
  max,
  format,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  max: number;
  /** Renders raw numbers by default; pass `formatBytes` for storage. */
  format?: (value: number) => string;
}) {
  const unlimited = !Number.isFinite(max);
  const percent = unlimited ? 0 : max === 0 ? 100 : Math.min(100, (used / max) * 100);
  const show = format ?? String;

  return (
    <div className="rounded-[14px] border border-hairline p-3.5">
      <dt className="flex items-center gap-2 text-[12px] text-ink-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-2.5 text-[20px] font-semibold leading-none">
        {show(used)}
        <span className="ml-1 text-[13px] font-normal text-ink-dim">
          {unlimited ? "· unlimited" : max === 0 ? "· Pro only" : `/ ${show(max)}`}
        </span>
      </dd>
      {!unlimited && (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className={`h-full rounded-full transition-all ${percent >= 100 ? "bg-[#ff453a]" : "bg-white/50"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}
