import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, LayoutGrid, Plus, Rocket, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/guards";
import { limitsFor } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectCard, type DashboardProject } from "@/components/app/project-card";
import { CheckoutResultBanner } from "@/components/billing/checkout-result-banner";

export const metadata: Metadata = {
  title: "My websites",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login?next=%2Fdashboard");

  const params = await searchParams;

  const [user, projects, downloadCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { plan: true, downloadCount: true, name: true },
    }),
    prisma.project.findMany({
      where: { userId: sessionUser.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        template: { select: { name: true, slug: true } },
      },
    }),
    prisma.download.count({ where: { userId: sessionUser.id } }),
  ]);

  if (!user) redirect("/login");

  const limits = limitsFor(user.plan);
  const projectLimitReached = projects.length >= limits.maxProjects;

  const cards: DashboardProject[] = projects.map((project) => ({
    id: project.id,
    name: project.name,
    status: project.status,
    updatedAt: project.updatedAt.toISOString(),
    templateName: project.template?.name ?? null,
    templateSlug: project.template?.slug ?? null,
  }));

  return (
    <div className="container-page py-10 sm:py-14">
      {params.upgraded === "1" && <CheckoutResultBanner />}

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.7rem,3vw,2.3rem)] font-semibold tracking-[-0.025em]">
            My websites
          </h1>
          <p className="mt-2 text-[14.5px] text-ink-muted">
            {projects.length === 0
              ? "Nothing here yet — pick a template and make it yours."
              : `${projects.length} ${projects.length === 1 ? "website" : "websites"}${
                  Number.isFinite(limits.maxProjects) ? ` of ${limits.maxProjects} on your plan` : ""
                }.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {user.plan === "FREE" && (
            <Link href="/pricing">
              <Button variant="secondary">
                <Sparkles /> Upgrade to Pro
              </Button>
            </Link>
          )}
          <Link href="/templates">
            <Button>
              <Plus /> New website
            </Button>
          </Link>
        </div>
      </header>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat
          icon={<LayoutGrid className="size-4" />}
          label="Websites"
          value={String(projects.length)}
          hint={Number.isFinite(limits.maxProjects) ? `${limits.maxProjects} included` : "Unlimited"}
        />
        <Stat
          icon={<Download className="size-4" />}
          label="Downloads"
          value={String(downloadCount)}
          hint={
            limits.downloadPeriodDays
              ? `${Math.max(0, limits.maxDownloads - user.downloadCount)} left this week`
              : `${Math.max(0, limits.maxDownloads - user.downloadCount)} remaining`
          }
        />
        <Link href="/guides/deploy" className="contents">
          <Stat
            icon={<Rocket className="size-4" />}
            label="Hosting"
            value="Free"
            hint="Read the guide →"
            interactive
          />
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center rounded-[14px] border border-dashed border-hairline px-6 py-20 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.05] text-ink-muted">
            <LayoutGrid className="size-5" />
          </span>
          <h2 className="mt-5 text-[18px] font-medium">You haven&apos;t created a website yet</h2>
          <p className="mt-2 max-w-[44ch] text-[14px] leading-relaxed text-ink-muted">
            Choose a template and start building. You can change every word, image and colour, then
            download the files and host them anywhere.
          </p>
          <Link href="/templates" className="mt-7">
            <Button size="lg">Browse templates</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}

            {!projectLimitReached && (
              <Link
                href="/templates"
                className="flex min-h-[260px] flex-col items-center justify-center rounded-[12px] border border-dashed border-hairline text-ink-muted transition-colors hover:border-hairline-strong hover:text-white"
              >
                <Plus className="size-6" />
                <span className="mt-3 text-[13.5px]">New website</span>
              </Link>
            )}
          </div>

          {projectLimitReached && user.plan === "FREE" && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-hairline bg-gradient-to-r from-white/[0.05] to-transparent p-5">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="brand">Free plan limit</Badge>
                </div>
                <p className="mt-2 max-w-[52ch] text-[14px] text-ink-muted">
                  You are using all {limits.maxProjects} of your free websites. Upgrade to Pro for
                  50 projects and 50 downloads a week.
                </p>
              </div>
              <Link href="/pricing">
                <Button>Upgrade to Pro — $20/mo</Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  interactive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={
        "card-surface rounded-[12px] p-4" +
        (interactive ? " transition-colors hover:border-hairline-strong" : "")
      }
    >
      <div className="flex items-center gap-2 text-ink-muted">
        {icon}
        <span className="text-[12.5px]">{label}</span>
      </div>
      <p className="mt-3 text-[26px] font-semibold leading-none tracking-[-0.02em]">{value}</p>
      <p className="mt-1.5 text-[12px] text-ink-dim">{hint}</p>
    </div>
  );
}
