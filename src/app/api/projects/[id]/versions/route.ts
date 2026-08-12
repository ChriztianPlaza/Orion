import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handleApiError, requireApiUser } from "@/lib/auth/guards";
import { getOwnedProject, snapshotVersion } from "@/lib/projects/service";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    await getOwnedProject(id, user.id);

    const versions = await prisma.projectVersion.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, label: true, revision: true, createdAt: true },
    });

    return Response.json({ versions });
  } catch (error) {
    return handleApiError(error);
  }
}

const postSchema = z.object({
  action: z.enum(["snapshot", "restore"]),
  label: z.string().trim().max(60).optional(),
  versionId: z.string().trim().max(60).optional(),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    await getOwnedProject(id, user.id);

    const parsed = postSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, "invalid_input", "Unknown version action.");

    if (parsed.data.action === "snapshot") {
      const version = await snapshotVersion(id, user.plan, parsed.data.label);
      return Response.json({ version }, { status: 201 });
    }

    if (!parsed.data.versionId) throw new ApiError(400, "invalid_input", "A version id is required.");

    const version = await prisma.projectVersion.findFirst({
      where: { id: parsed.data.versionId, projectId: id },
    });
    if (!version) throw new ApiError(404, "not_found", "That version no longer exists.");

    // Snapshot the current state first so restoring is itself reversible.
    await snapshotVersion(id, user.plan, "Before restore").catch(() => {});

    const restored = await prisma.project.update({
      where: { id },
      data: {
        content: version.content as Prisma.InputJsonValue,
        theme: version.theme as Prisma.InputJsonValue,
        meta: version.meta as Prisma.InputJsonValue,
        revision: { increment: 1 },
        lastEditedAt: new Date(),
      },
      select: { id: true, revision: true, content: true, theme: true, meta: true },
    });

    return Response.json({ project: restored });
  } catch (error) {
    return handleApiError(error);
  }
}
