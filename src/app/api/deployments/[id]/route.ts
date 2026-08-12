import { prisma } from "@/lib/db";
import { ApiError, handleApiError, requireApiUser } from "@/lib/auth/guards";
import { deleteDeployment, deleteProject as deletePagesProject } from "@/lib/cloudflare/pages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireApiUser();
    const { id } = await params;

    const deployment = await prisma.deployment.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        projectName: true,
        url: true,
        aliasUrl: true,
        steps: true,
        error: true,
        fileCount: true,
        bytes: true,
        createdAt: true,
        completedAt: true,
      },
    });
    if (!deployment) throw new ApiError(404, "not_found", "Deployment not found.");
    if (deployment.userId !== user.id && user.role !== "ADMIN") {
      throw new ApiError(403, "forbidden", "Not your deployment.");
    }

    return Response.json({ deployment });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Removes a deployment. `?project=1` also deletes the whole Pages project,
 * which is what "take my site offline" means to the user.
 */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireApiUser();
    const { id } = await params;

    const deployment = await prisma.deployment.findUnique({
      where: { id },
      select: { id: true, userId: true, projectName: true, externalId: true, projectId: true },
    });
    if (!deployment) throw new ApiError(404, "not_found", "Deployment not found.");
    if (deployment.userId !== user.id) throw new ApiError(403, "forbidden", "Not your deployment.");

    const removeProject = new URL(request.url).searchParams.get("project") === "1";

    try {
      if (removeProject) {
        await deletePagesProject(deployment.projectName);
      } else if (deployment.externalId) {
        await deleteDeployment(deployment.projectName, deployment.externalId);
      }
    } catch (error) {
      // The remote may already be gone; keep our records consistent regardless.
      console.warn("[deployments] remote delete failed", error);
    }

    await prisma.$transaction([
      prisma.deployment.update({
        where: { id },
        data: { status: "DELETED", completedAt: new Date() },
      }),
      ...(removeProject
        ? [
            prisma.project.update({
              where: { id: deployment.projectId },
              data: { subdomain: null, status: "DRAFT" },
            }),
          ]
        : []),
    ]);

    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
