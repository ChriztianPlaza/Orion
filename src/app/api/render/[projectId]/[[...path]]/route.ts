import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/guards";
import { isHtmlFile } from "@/lib/security/paths";
import { serveTemplateAsset } from "@/lib/templates/serve";
import type { ProjectContent, ProjectMeta, ProjectTheme } from "@/lib/templates/types";

/**
 * Renders a user's project with their edits applied.
 *   /api/render/<projectId>?editor=1   -> editor mode (adds the bridge script)
 *   /api/render/<projectId>/about.html -> another page
 *
 * Only the HTML is private — it carries the user's content. Stylesheets,
 * scripts and images belong to the template and are already public, so those
 * requests are redirected to the public preview route.
 *
 * That split is not cosmetic. The preview runs in a `sandbox`ed iframe with no
 * `allow-same-origin`, which gives the document an opaque origin. Chrome treats
 * subresource requests from an opaque origin as cross-site, so a `SameSite=Lax`
 * session cookie is not attached to them. The initial HTML navigation is issued
 * by the parent page and keeps its cookie, but every `<link>` and `<script>` the
 * document then requests arrives without one — which returned 401 and left the
 * editor rendering unstyled HTML.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ projectId: string; path?: string[] }> };

export async function GET(request: Request, { params }: Params) {
  const { projectId, path } = await params;
  const requested = path?.join("/") ?? "";

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
          status: true,
        },
      },
    },
  });

  if (!project) return deny(404, "Project not found.");
  if (!project.template) return deny(409, "This project's template is no longer available.");

  // Asset request: hand it to the public route, which needs no session.
  const isPage = requested === "" || isHtmlFile(requested);
  if (!isPage) {
    const target = `/api/preview/${encodeURIComponent(project.template.slug)}/${requested}`;
    return Response.redirect(new URL(target, request.url), 307);
  }

  // Pages carry the user's own content, so they stay behind the session.
  const user = await getSessionUser();
  if (!user) return deny(401, "Sign in to preview this project.");
  if (project.userId !== user.id && user.role !== "ADMIN") {
    return deny(403, "You do not have access to this project.");
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("editor") === "1" ? "editor" : "preview";
  const thumbnail = mode === "preview" && url.searchParams.get("thumb") === "1";

  return serveTemplateAsset(project.template, requested, {
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
