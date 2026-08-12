import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/guards";
import { clientIp, consumeRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/** Analytics only — template id and, when signed in, user id. Nothing else. */
export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;

  try {
    // Unauthenticated and it writes a row, so it needs a ceiling or it becomes
    // a way to inflate popularity and grow the table for free.
    const limit = await consumeRateLimit("template.view", clientIp(request.headers));
    if (!limit.ok) return Response.json({ ok: false }, { status: 429 });

    const template = await prisma.template.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!template) return Response.json({ ok: false }, { status: 404 });

    const user = await getSessionUser();

    await prisma.$transaction([
      prisma.template.update({
        where: { id: template.id },
        data: { viewCount: { increment: 1 } },
      }),
      prisma.templateView.create({
        data: { templateId: template.id, userId: user?.id ?? null },
      }),
    ]);

    return Response.json({ ok: true });
  } catch {
    // Never surface analytics failures to the visitor.
    return Response.json({ ok: false });
  }
}
