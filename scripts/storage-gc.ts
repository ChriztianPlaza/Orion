/**
 * Reclaims image storage that nothing points at any more.
 *
 *   npm run storage:gc -- --dry-run     see what would go
 *   npm run storage:gc                  delete it
 *   npm run storage:gc -- --grace 72    keep unplaced uploads for 72h
 *
 * Safe to run on a schedule — it only removes images that appear nowhere in a
 * project's saved content, so live projects and downloads are never affected.
 */

import { prisma } from "@/lib/db";
import { sweepOrphanedAssets } from "@/lib/storage/gc";
import { isBlobConfigured } from "@/lib/env";
import { formatBytes } from "@/lib/utils";

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const graceIndex = argv.indexOf("--grace");
  const graceHours = graceIndex >= 0 ? Number(argv[graceIndex + 1]) || 24 : 24;

  if (!isBlobConfigured()) {
    console.log("Object storage is not configured — nothing to sweep.");
    return;
  }

  const before = await prisma.projectAsset.aggregate({ _sum: { size: true }, _count: true });
  console.log(
    `Stored: ${before._count} image(s), ${formatBytes(before._sum.size ?? 0)}\n` +
      `Grace period for unplaced uploads: ${graceHours}h` +
      (dryRun ? "\nDRY RUN — nothing will be deleted" : ""),
  );

  const result = await sweepOrphanedAssets({ dryRun, graceHours });

  console.log(
    `\n  inspected      ${result.inspected}` +
      `\n  still in use   ${result.skippedInUse}` +
      `\n  within grace   ${result.skippedTooNew}` +
      `\n  ${dryRun ? "would delete" : "deleted     "}   ${result.deleted}` +
      `\n  reclaimed      ${formatBytes(result.bytesReclaimed)}`,
  );

  if (dryRun && result.deleted) {
    console.log("\nRun without --dry-run to reclaim it.");
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
