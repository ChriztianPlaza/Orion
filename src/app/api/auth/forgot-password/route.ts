import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { clientIp, consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/auth/guards";
import { isMailConfigured, passwordResetEmail, sendMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().email().max(200) });

export async function POST(request: Request) {
  try {
    const limit = await consumeRateLimit("auth.reset", clientIp(request.headers));
    if (!limit.ok) return rateLimitResponse(limit);

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "invalid_input", message: "Enter a valid email address." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    // Always answer the same way so this endpoint cannot enumerate accounts.
    const genericResponse = {
      ok: true,
      message: "If that address has an account, a reset link is on its way.",
      mailConfigured: isMailConfigured(),
    };

    if (!user) return Response.json(genericResponse);

    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const resetUrl = `${appUrl().replace(/\/$/, "")}/reset-password?token=${token}`;
    const message = passwordResetEmail(resetUrl);
    await sendMail({ to: email, ...message });

    return Response.json(genericResponse);
  } catch (error) {
    return handleApiError(error);
  }
}
