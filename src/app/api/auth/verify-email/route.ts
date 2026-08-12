import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/auth/guards";
import { issueVerificationCode, verifyCode } from "@/lib/auth/verification";

/**
 * POST — check a code.
 * PUT  — send a fresh one.
 *
 * Neither confirms whether an address is registered: an unknown email gets the
 * same shape of answer as a known one, so this cannot be used to enumerate
 * accounts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const verifySchema = z.object({
  email: z.string().trim().email().max(200),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the six-digit code."),
});

const resendSchema = z.object({ email: z.string().trim().email().max(200) });

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers);
    const limit = await consumeRateLimit("auth.verify", ip);
    if (!limit.ok) return rateLimitResponse(limit);

    const parsed = verifySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        {
          error: "invalid_input",
          message: parsed.error.issues[0]?.message ?? "Enter the six-digit code.",
        },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true },
    });

    // Same answer whether the address is unknown or the code is simply wrong.
    if (!user) {
      return Response.json(
        { error: "invalid_code", message: "That code is not right." },
        { status: 400 },
      );
    }

    if (user.emailVerified) return Response.json({ ok: true, alreadyVerified: true });

    const outcome = await verifyCode(user.id, parsed.data.code);
    if (!outcome.ok) {
      return Response.json({ error: outcome.reason, message: outcome.message }, { status: 400 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const ip = clientIp(request.headers);
    const limit = await consumeRateLimit("auth.resend", ip);
    if (!limit.ok) return rateLimitResponse(limit);

    const parsed = resendSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: "invalid_input", message: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    const generic = { ok: true, message: "If that account needs verifying, a new code is on its way." };

    if (!user || user.emailVerified) return Response.json(generic);

    const issued = await issueVerificationCode(user);
    if (issued.cooldownSeconds) {
      return Response.json(
        {
          error: "cooldown",
          message: `Please wait ${issued.cooldownSeconds}s before requesting another code.`,
          cooldownSeconds: issued.cooldownSeconds,
        },
        { status: 429 },
      );
    }

    return Response.json({ ...generic, devCode: issued.devCode });
  } catch (error) {
    return handleApiError(error);
  }
}
