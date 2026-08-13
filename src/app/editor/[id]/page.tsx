import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/guards";
import { getOwnedProject, getTemplateSchema } from "@/lib/projects/service";
import { limitsFor } from "@/lib/plans";
import { isStripeConfigured } from "@/lib/env";
import { EditorShell, type EditorProject } from "@/components/editor/editor-shell";
import type { ProjectContent, ProjectMeta, ProjectTheme } from "@/lib/templates/types";

export const metadata: Metadata = {
  title: "Editor",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect(`/login?next=${encodeURIComponent(`/editor/${id}`)}`);

  const [user, project] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { plan: true, downloadCount: true },
    }),
    getOwnedProject(id, sessionUser.id).catch(() => null),
  ]);

  if (!project || !user) notFound();
  if (!project.template) {
    redirect("/dashboard?error=template-removed");
  }

  const pages = await getTemplateSchema(project.template);

  const limits = limitsFor(user.plan);
  const downloadsLeft = Number.isFinite(limits.maxDownloads)
    ? Math.max(0, limits.maxDownloads - user.downloadCount)
    : Number.POSITIVE_INFINITY;

  const editorProject: EditorProject = {
    id: project.id,
    name: project.name,
    content: (project.content ?? {}) as ProjectContent,
    theme: (project.theme ?? {}) as ProjectTheme,
    meta: (project.meta ?? {}) as ProjectMeta,
    revision: project.revision,
    templateName: project.template.name,
    templateSlug: project.template.slug,
    entryFile: project.template.entryFile,
  };

  return (
    <EditorShell
      project={editorProject}
      pages={pages.map((page) => ({
        file: page.file,
        elementCount: page.elements.length,
        elements: page.elements,
      }))}
      plan={user.plan}
      downloadsLeft={Number.isFinite(downloadsLeft) ? downloadsLeft : 9999}
      billingEnabled={isStripeConfigured()}
    />
  );
}
