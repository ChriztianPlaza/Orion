/**
 * Lists accounts and their roles.
 *
 *   npm run admin:list
 *
 * Handy when `/admin` says forbidden and you need to see which address actually
 * got created versus what ADMIN_EMAILS expects.
 */

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      email: true,
      name: true,
      role: true,
      plan: true,
      emailVerified: true,
      createdAt: true,
      passwordHash: true,
      accounts: { select: { provider: true } },
    },
  });

  console.log(`\nADMIN_EMAILS = ${env.ADMIN_EMAILS.length ? env.ADMIN_EMAILS.join(", ") : "(empty)"}\n`);

  if (!users.length) {
    console.log("No accounts exist yet.");
    return;
  }

  console.log(`${users.length} account(s):\n`);
  for (const user of users) {
    const method = user.passwordHash
      ? "password"
      : user.accounts.map((a) => a.provider).join("/") || "unknown";
    const matches = env.ADMIN_EMAILS.includes(user.email.toLowerCase());

    console.log(`  ${user.email}`);
    console.log(`     role=${user.role}  plan=${user.plan}  sign-in=${method}`);
    console.log(`     verified=${user.emailVerified ? user.emailVerified.toISOString().slice(0, 10) : "no"}`);
    console.log(`     in ADMIN_EMAILS: ${matches ? "yes" : "NO"}`);
    console.log("");
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
