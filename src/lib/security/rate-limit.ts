import { prisma } from "@/lib/db";

/**
 * Durable sliding-window rate limiter backed by Postgres.
 *
 * Chosen over Redis so a fresh Vercel deploy needs no extra service. The
 * interface is intentionally tiny — swapping in Upstash later means
 * reimplementing `consume` only.
 */

export type RateLimitRule = { limit: number; windowSec: number };

export const RATE_LIMITS = {
  // Credentials sign-in, counted per account and per source address.
  "auth.login": { limit: 8, windowSec: 300 },
  "auth.login.ip": { limit: 30, windowSec: 900 },
  "auth.register": { limit: 5, windowSec: 3600 },
  "auth.reset": { limit: 5, windowSec: 3600 },
  // Six digits is a million combinations; this plus the five-attempt cap per
  // code is what makes guessing impractical.
  "auth.verify": { limit: 20, windowSec: 900 },
  "auth.resend": { limit: 6, windowSec: 3600 },

  "project.create": { limit: 30, windowSec: 3600 },
  "project.save": { limit: 600, windowSec: 3600 },
  "project.read": { limit: 400, windowSec: 300 },

  "download.export": { limit: 20, windowSec: 3600 },
  "deploy.create": { limit: 12, windowSec: 3600 },
  // Each check hits Cloudflare, so it is both a cost and an enumeration vector.
  "deploy.checkName": { limit: 60, windowSec: 600 },

  "upload.asset": { limit: 60, windowSec: 3600 },
  "billing.session": { limit: 20, windowSec: 3600 },

  "template.view": { limit: 120, windowSec: 300 },
  "template.favorite": { limit: 120, windowSec: 300 },

  "admin.template.upload": { limit: 40, windowSec: 3600 },
  "admin.bulk": { limit: 60, windowSec: 600 },

  "api.read": { limit: 300, windowSec: 60 },
} satisfies Record<string, RateLimitRule>;

export type RateLimitAction = keyof typeof RATE_LIMITS;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  limit: number;
  retryAfterSec: number;
};

/** Best-effort cleanup probability per call — keeps the table from growing. */
const SWEEP_CHANCE = 0.02;

export async function consumeRateLimit(
  action: RateLimitAction,
  identifier: string,
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[action];
  const bucket = `${action}:${identifier}`;
  const since = new Date(Date.now() - rule.windowSec * 1000);

  try {
    const used = await prisma.rateLimitHit.count({
      where: { bucket, createdAt: { gte: since } },
    });

    if (used >= rule.limit) {
      const oldest = await prisma.rateLimitHit.findFirst({
        where: { bucket, createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      const retryAfterSec = oldest
        ? Math.max(
            1,
            Math.ceil(
              (oldest.createdAt.getTime() + rule.windowSec * 1000 - Date.now()) / 1000,
            ),
          )
        : rule.windowSec;
      return { ok: false, remaining: 0, limit: rule.limit, retryAfterSec };
    }

    await prisma.rateLimitHit.create({ data: { bucket } });

    if (Math.random() < SWEEP_CHANCE) {
      void prisma.rateLimitHit
        .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } })
        .catch(() => {});
    }

    return {
      ok: true,
      remaining: rule.limit - used - 1,
      limit: rule.limit,
      retryAfterSec: 0,
    };
  } catch {
    // Never let limiter infrastructure take the product down.
    return { ok: true, remaining: rule.limit, limit: rule.limit, retryAfterSec: 0 };
  }
}

/** Client IP from Vercel's forwarding headers. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? "unknown";
}

export function rateLimitResponse(result: RateLimitResult) {
  return Response.json(
    {
      error: "rate_limited",
      message: `Too many requests. Try again in ${result.retryAfterSec}s.`,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
