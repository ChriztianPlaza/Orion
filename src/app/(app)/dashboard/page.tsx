import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CloudUpload, Download, LayoutGrid, Plus, Sparkles } from "lucide-react";
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

  const [user, projects, deploymentCount, downloadCount] = await Promise.all([
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
        subdomain: true,
        status: true,
        updatedAt: true,
        template: { select: { name: true, slug: true } },
        deployments: {
          where: { status: "SUCCESS" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { url: true },
        },
        _count: { select: { deployments: true } },
      },
    }),
    prisma.deployment.count({ where: { userId: sessionUser.id, status: "SUCCESS" } }),
    prisma.download.count({ where: { userId: sessionUser.id } }),
  ]);

  if (!user) redirect("/login");

  const limits = limitsFor(user.plan);
  const projectLimitReached = projects.length >= limits.maxProjects;

  const cards: DashboardProject[] = projects.map((project) => ({
    id: project.id,
    name: project.name,
    subdomain: project.subdomain,
    status: project.status,
    updatedAt: project.updatedAt.toISOString(),
    templateName: project.template?.name ?? null,
    templateSlug: project.template?.slug ?? null,
    liveUrl: project.deployments[0]?.url ?? null,
    deploymentCount: project._count.deployments,
  }));

  return (
    <div className="container-page py-10 sm:py-14">
      {params.upgraded === "1" && <CheckoutResultBanner />}

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.7rem,3vw,2.3rem)] font-semibold tracking-[-0.025em]">
            My websites
          </h1>
          <p className="mt-2 text-[14.5px] text-white/45">
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
            Number.isFinite(limits.maxDownloads)
              ? `${Math.max(0, limits.maxDownloads - user.downloadCount)} remaining`
              : "Unlimited"
          }
        />
        <Stat
          icon={<CloudUpload className="size-4" />}
          label="Deployments"
          value={String(deploymentCount)}
          hint={limits.canDeploy ? "Cloudflare Pages" : "Pro feature"}
        />
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center rounded-[22px] border border-dashed border-white/10 px-6 py-20 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.05] text-white/35">
            <LayoutGrid className="size-5" />
          </span>
          <h2 className="mt-5 text-[18px] font-medium">You haven&apos;t created a website yet</h2>
          <p className="mt-2 max-w-[44ch] text-[14px] leading-relaxed text-white/40">
            Choose a template and start building. You can change every word, image and colour, then
            download the files or deploy it live.
          </p>
          <Link href="/templates" className="mt-7">
            <Button size="lg">Browse templates</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((project) => (
              <ProjectCard key={project.id} project={project} canDeploy={limits.canDeploy} />
            ))}

            {!projectLimitReached && (
              <Link
                href="/templates"
                className="flex min-h-[260px] flex-col items-center justify-center rounded-[18px] border border-dashed border-white/10 text-white/35 transition-colors hover:border-white/25 hover:text-white"
              >
                <Plus className="size-6" />
                <span className="mt-3 text-[13.5px]">New website</span>
              </Link>
            )}
          </div>

          {projectLimitReached && user.plan === "FREE" && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-white/[0.09] bg-gradient-to-r from-white/[0.05] to-transparent p-5">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="brand">Free plan limit</Badge>
                </div>
                <p className="mt-2 max-w-[52ch] text-[14px] text-white/55">
                  You are using your one free website. Upgrade to Pro for unlimited projects,
                  unlimited downloads and one-click deployment.
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="card-surface rounded-[16px] p-4">
      <div className="flex items-center gap-2 text-white/35">
        {icon}
        <span className="text-[12.5px]">{label}</span>
      </div>
      <p className="mt-3 text-[26px] font-semibold leading-none tracking-[-0.02em]">{value}</p>
      <p className="mt-1.5 text-[12px] text-white/30">{hint}</p>
    </div>
  );
}
