/**
 * Grants or revokes the ADMIN role.
 *
 *   npm run admin:promote -- you@example.com
 *   npm run admin:promote -- you@example.com --revoke
 *
 * The role lives in the database, so this survives restarts and does not depend
 * on ADMIN_EMAILS staying set. Use ADMIN_EMAILS only to bootstrap the very first
 * administrator, then remove it.
 */

import { prisma } from "@/lib/db";

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const email = args.find((arg) => arg.includes("@"))?.toLowerCase();

  if (!email) {
    console.error("Usage: npm run admin:promote -- you@example.com [--revoke]");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    console.error(`No account exists for ${email}. Sign up first, then run this.`);
    process.exit(1);
  }

  const role = revoke ? "USER" : "ADMIN";
  if (user.role === role) {
    console.log(`${email} is already ${role}. Nothing to do.`);
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { role } });
  console.log(`${email}: ${user.role} -> ${role}`);
  console.log("\nSign out and back in for the change to reach your session.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
