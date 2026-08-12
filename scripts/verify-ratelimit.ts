/**
 * Proves the rate limiter actually refuses traffic.
 *
 *   npm run verify:ratelimit
 *
 * Requires DATABASE_URL — the limiter is Postgres-backed. It burns one bucket
 * under a random key, so it is safe to run against a live database.
 */

import { RATE_LIMITS, consumeRateLimit } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/db";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL is not set — skipping (the limiter needs Postgres).");
    return;
  }

  const action = "auth.login" as const;
  const rule = RATE_LIMITS[action];
  const identity = `verify-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  console.log(`Rule: ${rule.limit} attempts per ${rule.windowSec}s\n`);

  let allowed = 0;
  let refused = 0;
  let firstRefusalAt = 0;

  for (let attempt = 1; attempt <= rule.limit + 4; attempt += 1) {
    const result = await consumeRateLimit(action, identity);
    if (result.ok) {
      allowed += 1;
    } else {
      refused += 1;
      if (!firstRefusalAt) firstRefusalAt = attempt;
    }
    console.log(
      `  attempt ${String(attempt).padStart(2)}  ${result.ok ? "allowed" : "REFUSED"}  remaining=${result.remaining}${result.retryAfterSec ? `  retryAfter=${result.retryAfterSec}s` : ""}`,
    );
  }

  await prisma.rateLimitHit.deleteMany({ where: { bucket: `${action}:${identity}` } });

  const ok = allowed === rule.limit && refused === 4 && firstRefusalAt === rule.limit + 1;
  console.log(
    `\n${allowed} allowed, ${refused} refused, first refusal on attempt ${firstRefusalAt}.`,
  );
  console.log(ok ? "PASS — the limiter engages exactly at the configured limit." : "FAIL");

  if (!ok) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error("Could not reach the database:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
