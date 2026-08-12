import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { clientIp, consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().trim().min(20).max(200),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200)
    .refine((value) => /[a-zA-Z]/.test(value) && /[0-9]/.test(value), {
      message: "Include at least one letter and one number.",
    }),
});

export async function POST(request: Request) {
  try {
    const limit = await consumeRateLimit("auth.reset", clientIp(request.headers));
    if (!limit.ok) return rateLimitResponse(limit);

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        {
          error: "invalid_input",
          message: parsed.error.issues[0]?.message ?? "Check the form and try again.",
        },
        { status: 400 },
      );
    }

    const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expires: true, usedAt: true },
    });

    if (!record || record.usedAt || record.expires < new Date()) {
      return Response.json(
        {
          error: "invalid_token",
          message: "That reset link is invalid or has expired. Request a new one.",
        },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Invalidate any database sessions belonging to this account.
      prisma.session.deleteMany({ where: { userId: record.userId } }),
    ]);

    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
