import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deleteObject } from "./blob";

/**
 * Keeps object storage bounded.
 *
 * Uploaded images cannot simply be deleted once a user downloads their ZIP:
 * the blob URL is still recorded in the project's content map, so the editor
 * preview and any later download (which re-fetches the blob to bundle it) would
 * both break. An image is only safe to remove once nothing points at it.
 *
 * So the rule is reference counting, not age:
 *
 *   - a project is deleted        -> its images are deleted with it
 *   - an image is replaced        -> the old one is unreferenced, sweep it
 *   - uploaded but never placed   -> unreferenced, sweep after a grace period
 *
 * Everything still in use is left alone.
 */

/** How long an unreferenced upload is kept before it is swept. */
const GRACE_PERIOD_HOURS = 24;

export type SweepResult = {
  inspected: number;
  deleted: number;
  bytesReclaimed: number;
  skippedInUse: number;
  skippedTooNew: number;
};

/**
 * Removes every image belonging to a project, from storage and the database.
 * Call before deleting the project row — afterwards the asset rows are gone
 * (cascade) and the blobs would be stranded with nothing pointing at them.
 */
export async function deleteProjectAssets(projectId: string): Promise<number> {
  const assets = await prisma.projectAsset.findMany({
    where: { projectId },
    select: { id: true, url: true },
  });
  if (!assets.length) return 0;

  await Promise.all(assets.map((asset) => deleteObject(asset.url)));
  await prisma.projectAsset.deleteMany({ where: { projectId } });

  return assets.length;
}

/**
 * Removes every string that is (or embeds) one of `urls`, recursively.
 *
 * Keys whose whole value is a dead URL are dropped rather than blanked, so the
 * editor falls back to the template's own image instead of rendering an empty
 * `src`. URLs buried inside a larger string — a `background-image:url(...)`
 * declaration, say — are cut out in place.
 */
function stripUrls(value: unknown, urls: Set<string>): unknown {
  if (typeof value === "string") {
    if (urls.has(value)) return undefined;
    let next = value;
    for (const url of urls) {
      if (next.includes(url)) next = next.split(url).join("");
    }
    return next;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => stripUrls(entry, urls)).filter((entry) => entry !== undefined);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      const next = stripUrls(entry, urls);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }
  return value;
}

/**
 * Hands back every image a project is holding, immediately.
 *
 * Called once the user has downloaded the site. By that point the bytes are
 * inside their ZIP under `assets/uploads/`, rewritten to relative paths, so the
 * downloaded site is complete and self-contained without us — there is nothing
 * left for the hosted copy to do except cost storage.
 *
 * References are cleared before the blobs are deleted. The other order would
 * briefly leave the editor pointing at a URL that 404s; this way the worst case
 * is an orphaned blob, which `sweepOrphanedAssets` collects later.
 */
export async function releaseProjectImages(
  projectId: string,
): Promise<{ released: number; bytesFreed: number }> {
  const assets = await prisma.projectAsset.findMany({
    where: { projectId },
    select: { id: true, url: true, size: true },
  });
  if (!assets.length) return { released: 0, bytesFreed: 0 };

  const urls = new Set(assets.map((asset) => asset.url));

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { content: true, meta: true, theme: true },
  });

  if (project) {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        content: stripUrls(project.content, urls) as Prisma.InputJsonValue,
        meta: stripUrls(project.meta, urls) as Prisma.InputJsonValue,
        theme: stripUrls(project.theme, urls) as Prisma.InputJsonValue,
        // An editor open in another tab is still holding the old content map.
        // Moving the revision on makes its next autosave fail the stale-write
        // guard instead of quietly resurrecting URLs that no longer resolve.
        revision: { increment: 1 },
      },
    });
  }

  await Promise.all(assets.map((asset) => deleteObject(asset.url)));
  await prisma.projectAsset.deleteMany({ where: { projectId } });

  return {
    released: assets.length,
    bytesFreed: assets.reduce((total, asset) => total + asset.size, 0),
  };
}

/** Is this URL still mentioned anywhere in the project's saved content? */
function isReferenced(url: string, content: unknown): boolean {
  if (!content) return false;
  // The content map is a small object of short strings; a serialised scan is
  // cheaper and more reliable than walking every possible shape.
  return JSON.stringify(content).includes(url);
}

export async function sweepOrphanedAssets(options?: {
  /** Report what would be removed without deleting anything. */
  dryRun?: boolean;
  graceHours?: number;
  userId?: string;
}): Promise<SweepResult> {
  const graceHours = options?.graceHours ?? GRACE_PERIOD_HOURS;
  const cutoff = new Date(Date.now() - graceHours * 3600_000);

  const assets = await prisma.projectAsset.findMany({
    where: options?.userId ? { userId: options.userId } : {},
    select: {
      id: true,
      url: true,
      size: true,
      createdAt: true,
      projectId: true,
      project: { select: { content: true, meta: true, theme: true } },
    },
  });

  const result: SweepResult = {
    inspected: assets.length,
    deleted: 0,
    bytesReclaimed: 0,
    skippedInUse: 0,
    skippedTooNew: 0,
  };

  for (const asset of assets) {
    // Still placed somewhere in the project — keep it.
    if (asset.project) {
      const used =
        isReferenced(asset.url, asset.project.content) ||
        isReferenced(asset.url, asset.project.meta) ||
        isReferenced(asset.url, asset.project.theme);
      if (used) {
        result.skippedInUse += 1;
        continue;
      }
    }

    // Recently uploaded and possibly about to be placed — leave it for now.
    if (asset.createdAt > cutoff) {
      result.skippedTooNew += 1;
      continue;
    }

    if (!options?.dryRun) {
      await deleteObject(asset.url);
      await prisma.projectAsset.delete({ where: { id: asset.id } }).catch(() => {});
    }

    result.deleted += 1;
    result.bytesReclaimed += asset.size;
  }

  return result;
}

/** Total bytes a user currently occupies. Used to enforce the plan quota. */
export async function storageUsedBy(userId: string): Promise<number> {
  const total = await prisma.projectAsset.aggregate({
    where: { userId },
    _sum: { size: true },
  });
  return total._sum.size ?? 0;
}
