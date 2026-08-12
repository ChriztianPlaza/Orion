import { handleApiError, requireApiUser } from "@/lib/auth/guards";
import { consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { getOwnedProject, getTemplateSchema } from "@/lib/projects/service";

/**
 * The editable-element schema for a project's template: what the editor's
 * sidebar lists, grouped by page and section.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireApiUser();

    // Parsing every page of a template is the most expensive read in the app.
    const limit = await consumeRateLimit("project.read", user.id);
    if (!limit.ok) return rateLimitResponse(limit);

    const { id } = await params;
    const project = await getOwnedProject(id, user.id, user.role === "ADMIN");

    if (!project.template) {
      return Response.json(
        { error: "template_missing", message: "This project's template is no longer available." },
        { status: 409 },
      );
    }

    const pages = await getTemplateSchema(project.template);

    return Response.json({
      entryFile: project.template.entryFile,
      pages: pages.map((page) => ({
        file: page.file,
        elementCount: page.elements.length,
        elements: page.elements,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
