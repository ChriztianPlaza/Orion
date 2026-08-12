import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handleApiError, requireApiAdmin } from "@/lib/auth/guards";
import { clientIp, consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { logAdminAction } from "@/lib/admin/analytics";

/**
 * Bulk edits from the admin template table.
 *
 * Restricted to the three fields that are safe to change en masse — tier,
 * status and featured. Anything that touches files or licensing stays per
 * template, where the operator has to look at what they are changing.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IDS = 500;

const schema = z.discriminatedUnion("field", [
  z.object({
    field: z.literal("tier"),
    value: z.enum(["FREE", "PRO"]),
    ids: z.array(z.string().min(1).max(60)).min(1).max(MAX_IDS),
  }),
  z.object({
    field: z.literal("status"),
    value: z.enum(["PUBLISHED", "DRAFT", "DISABLED"]),
    ids: z.array(z.string().min(1).max(60)).min(1).max(MAX_IDS),
  }),
  z.object({
    field: z.literal("featured"),
    value: z.boolean(),
    ids: z.array(z.string().min(1).max(60)).min(1).max(MAX_IDS),
  }),
]);

export async function PATCH(request: Request) {
  try {
    const admin = await requireApiAdmin();

    const limit = await consumeRateLimit("admin.bulk", admin.id);
    if (!limit.ok) return rateLimitResponse(limit);

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_input",
        `Select up to ${MAX_IDS} templates and choose tier, status or featured.`,
      );
    }

    const { field, value, ids } = parsed.data;
    const unique = [...new Set(ids)];

    const result = await prisma.template.updateMany({
      where: { id: { in: unique } },
      data: { [field]: value },
    });

    await logAdminAction({
      userId: admin.id,
      action: `template.bulk_${field}`,
      target: `${result.count} templates`,
      metadata: { field, value, requested: unique.length, updated: result.count },
      ip: clientIp(request.headers),
    });

    return Response.json({
      updated: result.count,
      field,
      value,
      message: `${result.count} template${result.count === 1 ? "" : "s"} updated.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
