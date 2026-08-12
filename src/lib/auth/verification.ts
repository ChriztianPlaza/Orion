import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { isMailConfigured, sendMail, verificationEmail } from "@/lib/mail";

/**
 * Email verification by one-time code.
 *
 * Design notes:
 *  - The code is six digits, which is only a million possibilities, so guessing
 *    is bounded three ways: five attempts per code, a ten-minute expiry, and a
 *    rate limit on the endpoint itself.
 *  - Only a SHA-256 hash is stored. A database leak cannot be replayed.
 *  - Issuing a new code invalidates every earlier one, so an old email in the
 *    inbox stops working the moment a fresh one is requested.
 */

export const CODE_LENGTH = 6;
export const CODE_TTL_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

function generateCode(): string {
  // Rejection-free: take a uniform int below 10^6 and zero-pad.
  const max = 10 ** CODE_LENGTH;
  const value = crypto.randomInt(0, max);
  return String(value).padStart(CODE_LENGTH, "0");
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export type IssueResult = {
  sent: boolean;
  /** Returned only in development when no mail provider is configured. */
  devCode?: string;
  cooldownSeconds?: number;
};

export async function issueVerificationCode(user: {
  id: string;
  email: string;
  name: string | null;
}): Promise<IssueResult> {
  // Cooldown, so the endpoint cannot be used to spam someone's inbox.
  const latest = await prisma.emailVerificationCode.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (latest) {
    const elapsed = (Date.now() - latest.createdAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      return { sent: false, cooldownSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed) };
    }
  }

  const code = generateCode();

  await prisma.$transaction([
    // Any earlier code stops working immediately.
    prisma.emailVerificationCode.deleteMany({ where: { userId: user.id, consumedAt: null } }),
    prisma.emailVerificationCode.create({
      data: {
        userId: user.id,
        codeHash: hashCode(code),
        expires: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
      },
    }),
  ]);

  const message = verificationEmail(code, user.name);
  await sendMail({ to: user.email, ...message });

  if (!isMailConfigured() && process.env.NODE_ENV !== "production") {
    // Local development without Resend: surface the code so the flow is still
    // testable. Never in production, where it would defeat the whole point.
    return { sent: false, devCode: code };
  }

  return { sent: true };
}

export type VerifyOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" | "no_code"; message: string };

export async function verifyCode(userId: string, code: string): Promise<VerifyOutcome> {
  const record = await prisma.emailVerificationCode.findFirst({
    where: { userId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { ok: false, reason: "no_code", message: "Request a new code to continue." };
  }

  if (record.expires < new Date()) {
    await prisma.emailVerificationCode.delete({ where: { id: record.id } }).catch(() => {});
    return { ok: false, reason: "expired", message: "That code has expired. Request a new one." };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.emailVerificationCode.delete({ where: { id: record.id } }).catch(() => {});
    return {
      ok: false,
      reason: "too_many_attempts",
      message: "Too many incorrect attempts. Request a new code.",
    };
  }

  const supplied = hashCode(code.replace(/\D/g, ""));
  const expected = record.codeHash;

  const matches =
    supplied.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));

  if (!matches) {
    const updated = await prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    const left = Math.max(0, MAX_ATTEMPTS - updated.attempts);
    return {
      ok: false,
      reason: "invalid",
      message: left
        ? `That code is not right. ${left} attempt${left === 1 ? "" : "s"} left.`
        : "Too many incorrect attempts. Request a new code.",
    };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
