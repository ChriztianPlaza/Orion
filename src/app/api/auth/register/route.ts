import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { env } from "@/lib/env";
import { clientIp, consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/auth/guards";
import { issueVerificationCode } from "@/lib/auth/verification";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email().max(200),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200)
    .refine((value) => /[a-zA-Z]/.test(value) && /[0-9]/.test(value), {
      message: "Include at least one letter and one number.",
    }),
});

/**
 * Creates an account in an unverified state and emails a one-time code.
 *
 * The account cannot sign in until that code is entered — see the credentials
 * provider — so an address nobody controls never becomes a usable account.
 */
export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers);
    const limit = await consumeRateLimit("auth.register", ip);
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

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, emailVerified: true, passwordHash: true },
    });

    if (existing) {
      // An account that was created but never verified is not really taken —
      // re-issuing a code lets someone who abandoned the flow pick it back up
      // without us confirming to a stranger that the address is registered.
      if (!existing.emailVerified) {
        const issued = await issueVerificationCode(existing);
        return Response.json(
          { ok: true, needsVerification: true, email, ...issued },
          { status: 200 },
        );
      }

      return Response.json(
        { error: "email_taken", message: "That email cannot be used. Try signing in instead." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const isBootstrapAdmin = env.ADMIN_EMAILS.includes(email);

    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name ?? null,
        passwordHash,
        role: isBootstrapAdmin ? "ADMIN" : "USER",
      },
      select: { id: true, email: true, name: true },
    });

    const issued = await issueVerificationCode(user);

    return Response.json({ ok: true, needsVerification: true, email, ...issued }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
