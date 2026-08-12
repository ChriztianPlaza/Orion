import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/guards";
import { serveTemplateAsset } from "@/lib/templates/serve";
import type { ProjectContent, ProjectMeta, ProjectTheme } from "@/lib/templates/types";

/**
 * Renders a user's project with their edits applied.
 *   /api/render/<projectId>?editor=1   -> editor mode (adds the bridge script)
 *   /api/render/<projectId>/about.html -> another page
 *
 * Owner-only. Admins can view any project for support purposes, which is
 * recorded in the admin activity log by the calling page, not here.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ projectId: string; path?: string[] }> };

export async function GET(request: Request, { params }: Params) {
  const { projectId, path } = await params;
  const user = await getSessionUser();
  if (!user) return deny(401, "Sign in to preview this project.");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      userId: true,
      content: true,
      theme: true,
      meta: true,
      template: {
        select: {
          id: true,
          slug: true,
          storage: true,
          sourceRef: true,
          entryFile: true,
          attribution: true,
        },
      },
    },
  });

  if (!project) return deny(404, "Project not found.");
  if (project.userId !== user.id && user.role !== "ADMIN") {
    return deny(403, "You do not have access to this project.");
  }
  if (!project.template) return deny(409, "This project's template is no longer available.");

  const url = new URL(request.url);
  const mode = url.searchParams.get("editor") === "1" ? "editor" : "preview";
  const thumbnail = mode === "preview" && url.searchParams.get("thumb") === "1";

  return serveTemplateAsset(project.template, path?.join("/"), {
    mode,
    thumbnail,
    baseHref: `/api/render/${encodeURIComponent(projectId)}/`,
    content: (project.content ?? {}) as ProjectContent,
    theme: (project.theme ?? {}) as ProjectTheme,
    meta: (project.meta ?? {}) as ProjectMeta,
  });
}

function deny(status: number, message: string) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
