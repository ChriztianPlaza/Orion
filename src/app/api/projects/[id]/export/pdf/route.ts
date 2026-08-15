import { prisma } from "@/lib/db";
import { ApiError, handleApiError, requireApiUser } from "@/lib/auth/guards";
import { consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { getOwnedProject } from "@/lib/projects/service";
import { generateSite } from "@/lib/templates/generate";
import { renderSitePdf } from "@/lib/templates/pdf";
import { slugify } from "@/lib/utils";
import type { ProjectContent, ProjectMeta, ProjectTheme } from "@/lib/templates/types";

/**
 * Renders the project to a PDF.
 *
 * Unlike the ZIP this does not spend a download allowance and does not release
 * the project's uploaded images. The paid action is taking the source files;
 * a PDF is a picture of them, useful for showing a client before either of you
 * commits to anything.
 *
 * It is rate limited on its own bucket because each call starts a browser.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const sessionUser = await requireApiUser();
    const { id } = await params;

    const limit = await consumeRateLimit("download.pdf", sessionUser.id);
    if (!limit.ok) return rateLimitResponse(limit);

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true },
    });
    if (!user) throw new ApiError(401, "unauthorized", "Session no longer valid.");

    const project = await getOwnedProject(id, user.id);
    if (!project.template) {
      throw new ApiError(409, "template_missing", "This project's template is no longer available.");
    }

    const files = await generateSite({
      template: project.template,
      content: (project.content ?? {}) as ProjectContent,
      theme: (project.theme ?? {}) as ProjectTheme,
      meta: (project.meta ?? {}) as ProjectMeta,
    });

    let pdf: Uint8Array;
    try {
      pdf = await renderSitePdf(files, project.template.entryFile);
    } catch (error) {
      // Rendering needs a browser, which is the one part of this app that can
      // be missing from an otherwise healthy deployment. Say so plainly rather
      // than surfacing a Puppeteer stack trace.
      console.error("[pdf] render failed", error);
      throw new ApiError(
        503,
        "pdf_unavailable",
        "PDF rendering is unavailable on this instance. Download the ZIP instead — it contains the same site.",
      );
    }

    const filename = `${slugify(project.name) || "website"}.pdf`;

    return new Response(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdf.byteLength),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
