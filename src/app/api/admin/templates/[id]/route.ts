import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handleApiError, requireApiAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/analytics";
import { clientIp } from "@/lib/security/rate-limit";
import { deleteObject } from "@/lib/storage/blob";
import { stripTags } from "@/lib/security/sanitize";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(600).optional(),
  status: z.enum(["PUBLISHED", "DRAFT", "DISABLED"]).optional(),
  tier: z.enum(["FREE", "PRO"]).optional(),
  featured: z.boolean().optional(),
  categorySlug: z.string().trim().max(60).nullable().optional(),
  tags: z.array(z.string().trim().max(40)).max(12).optional(),
  license: z.string().trim().min(1).max(60).optional(),
  author: z.string().trim().max(120).nullable().optional(),
  source: z.string().trim().max(400).nullable().optional(),
  attribution: z.string().trim().max(400).nullable().optional(),
  colorScheme: z.enum(["dark", "light", "colorful"]).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireApiAdmin();
    const { id } = await params;

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError(400, "invalid_input", "Some fields were not valid.");
    }

    const template = await prisma.template.findUnique({ where: { id }, select: { id: true, slug: true } });
    if (!template) throw new ApiError(404, "not_found", "Template not found.");

    const { categorySlug, tags, ...rest } = parsed.data;

    const categoryId =
      categorySlug === undefined
        ? undefined
        : categorySlug === null
          ? null
          : ((
              await prisma.category.findUnique({
                where: { slug: categorySlug },
                select: { id: true },
              })
            )?.id ?? null);

    const updated = await prisma.template.update({
      where: { id },
      data: {
        ...rest,
        ...(rest.name ? { name: stripTags(rest.name) } : {}),
        ...(rest.description !== undefined ? { description: stripTags(rest.description) } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
      },
      select: { id: true, slug: true, name: true, status: true, tier: true, featured: true },
    });

    if (tags) {
      await prisma.templateTag.deleteMany({ where: { templateId: id } });
      for (const tagName of tags) {
        const tagSlug = slugify(tagName);
        if (!tagSlug) continue;
        const tag = await prisma.tag.upsert({
          where: { slug: tagSlug },
          create: { slug: tagSlug, name: tagName },
          update: {},
        });
        await prisma.templateTag.create({ data: { templateId: id, tagId: tag.id } });
      }
    }

    await logAdminAction({
      userId: admin.id,
      action: "template.update",
      target: updated.slug,
      targetId: updated.id,
      metadata: parsed.data as Record<string, unknown>,
      ip: clientIp(request.headers),
    });

    return Response.json({ template: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const admin = await requireApiAdmin();
    const { id } = await params;

    const template = await prisma.template.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        name: true,
        storage: true,
        files: { select: { url: true } },
        _count: { select: { projects: true } },
      },
    });
    if (!template) throw new ApiError(404, "not_found", "Template not found.");

    // Projects keep working: the relation is SetNull, but a template still in
    // use is disabled rather than destroyed unless the caller insists.
    const force = new URL(request.url).searchParams.get("force") === "1";
    if (template._count.projects > 0 && !force) {
      await prisma.template.update({ where: { id }, data: { status: "DISABLED" } });
      await logAdminAction({
        userId: admin.id,
        action: "template.disable",
        target: template.slug,
        targetId: id,
        metadata: { reason: "in use", projects: template._count.projects },
        ip: clientIp(request.headers),
      });
      return Response.json({
        ok: true,
        disabled: true,
        message: `${template._count.projects} project(s) use this template, so it was disabled instead of deleted.`,
      });
    }

    for (const file of template.files) {
      if (file.url) await deleteObject(file.url);
    }

    await prisma.template.delete({ where: { id } });

    await logAdminAction({
      userId: admin.id,
      action: "template.delete",
      target: template.slug,
      targetId: id,
      metadata: { name: template.name, forced: force },
      ip: clientIp(request.headers),
    });

    return Response.json({ ok: true, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
