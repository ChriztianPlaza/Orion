import { handleApiError, requireApiUser } from "@/lib/auth/guards";
import { consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { duplicateProject } from "@/lib/projects/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await requireApiUser();
    const { id } = await params;

    const limit = await consumeRateLimit("project.create", user.id);
    if (!limit.ok) return rateLimitResponse(limit);

    const project = await duplicateProject(id, user.id, user.plan);
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
