import { z } from "zod";
import { handleApiError, requireApiUser } from "@/lib/auth/guards";
import { consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { deleteProject, getOwnedProject, saveProject } from "@/lib/projects/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  content: z.unknown().optional(),
  theme: z.unknown().optional(),
  meta: z.unknown().optional(),
  baseRevision: z.number().int().nonnegative().optional(),
});

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const project = await getOwnedProject(id, user.id, user.role === "ADMIN");

    return Response.json({
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        status: project.status,
        content: project.content,
        theme: project.theme,
        meta: project.meta,
        revision: project.revision,
        updatedAt: project.updatedAt,
        template: project.template,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireApiUser();
    const { id } = await params;

    const limit = await consumeRateLimit("project.save", user.id);
    if (!limit.ok) return rateLimitResponse(limit);

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: "invalid_input", message: "The save payload was not valid." },
        { status: 400 },
      );
    }

    const saved = await saveProject({
      projectId: id,
      userId: user.id,
      plan: user.plan,
      ...parsed.data,
    });

    return Response.json({ project: saved });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    await deleteProject(id, user.id);
    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
