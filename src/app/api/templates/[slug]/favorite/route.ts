import { prisma } from "@/lib/db";
import { handleApiError, requireApiUser, ApiError } from "@/lib/auth/guards";
import { consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

async function templateIdFor(slug: string) {
  const template = await prisma.template.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!template) throw new ApiError(404, "not_found", "Template not found.");
  return template.id;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireApiUser();
    const { slug } = await params;
    const templateId = await templateIdFor(slug);

    const favorite = await prisma.favorite.findUnique({
      where: { userId_templateId: { userId: user.id, templateId } },
      select: { id: true },
    });

    return Response.json({ favorited: Boolean(favorite) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await requireApiUser();

    // Toggling writes rows and moves a counter, so it gets a ceiling too.
    const limit = await consumeRateLimit("template.favorite", user.id);
    if (!limit.ok) return rateLimitResponse(limit);

    const { slug } = await params;
    const templateId = await templateIdFor(slug);

    const created = await prisma.favorite.upsert({
      where: { userId_templateId: { userId: user.id, templateId } },
      create: { userId: user.id, templateId },
      update: {},
      select: { id: true, createdAt: true },
    });

    // Only bump the counter when the row is genuinely new.
    if (Date.now() - created.createdAt.getTime() < 2000) {
      await prisma.template.update({
        where: { id: templateId },
        data: { favoriteCount: { increment: 1 } },
      });
    }

    return Response.json({ favorited: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireApiUser();
    const { slug } = await params;
    const templateId = await templateIdFor(slug);

    const deleted = await prisma.favorite.deleteMany({
      where: { userId: user.id, templateId },
    });
    if (deleted.count > 0) {
      await prisma.template.update({
        where: { id: templateId },
        data: { favoriteCount: { decrement: deleted.count } },
      });
    }

    return Response.json({ favorited: false });
  } catch (error) {
    return handleApiError(error);
  }
}
