import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiUser } from "@/lib/auth/guards";
import { clientIp, consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { createProjectFromTemplate } from "@/lib/projects/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  templateSlug: z.string().trim().min(1).max(120).optional(),
  templateId: z.string().trim().min(1).max(60).optional(),
  name: z.string().trim().min(1).max(80).optional(),
});

export async function GET() {
  try {
    const user = await requireApiUser();
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        thumbnail: true,
        updatedAt: true,
        createdAt: true,
        template: { select: { slug: true, name: true } },
        deployments: {
          where: { status: "SUCCESS" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { url: true, projectName: true, createdAt: true },
        },
      },
    });
    return Response.json({ projects });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();

    const limit = await consumeRateLimit("project.create", user.id || clientIp(request.headers));
    if (!limit.ok) return rateLimitResponse(limit);

    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success || (!parsed.data.templateSlug && !parsed.data.templateId)) {
      return Response.json(
        { error: "invalid_input", message: "A template must be specified." },
        { status: 400 },
      );
    }

    const { project } = await createProjectFromTemplate({
      userId: user.id,
      plan: user.plan,
      ...parsed.data,
    });

    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
