/**
 * Marks pre-existing accounts as verified.
 *
 *   npm run admin:verify-existing
 *
 * Email verification was added after these accounts were created. Without this
 * they would be locked out by a rule that did not exist when they signed up.
 * Run once, immediately after deploying the verification feature.
 */

import { prisma } from "@/lib/db";

async function main() {
  const pending = await prisma.user.findMany({
    where: { emailVerified: null },
    select: { email: true, createdAt: true },
  });

  if (!pending.length) {
    console.log("Every account is already verified. Nothing to do.");
    return;
  }

  console.log(`Marking ${pending.length} pre-existing account(s) as verified:`);
  for (const user of pending) console.log(`  ${user.email}`);

  const result = await prisma.user.updateMany({
    where: { emailVerified: null },
    data: { emailVerified: new Date() },
  });

  console.log(`\nDone. ${result.count} updated.`);
  console.log("New sign-ups from here on must confirm a code.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
