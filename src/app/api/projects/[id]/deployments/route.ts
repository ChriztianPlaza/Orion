import { prisma } from "@/lib/db";
import { handleApiError, requireApiUser } from "@/lib/auth/guards";
import { getOwnedProject } from "@/lib/projects/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    await getOwnedProject(id, user.id);

    const deployments = await prisma.deployment.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        projectName: true,
        url: true,
        aliasUrl: true,
        fileCount: true,
        bytes: true,
        steps: true,
        error: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return Response.json({ deployments });
  } catch (error) {
    return handleApiError(error);
  }
}
