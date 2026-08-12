import { prisma } from "@/lib/db";
import { mimeTypeFor, normalizeTemplatePath } from "@/lib/security/paths";
import { bundledTemplates } from "@/generated/templates";
import type { TemplateFileRecord } from "./types";
import type { Template } from "@prisma/client";

/**
 * Unified read access to template files, whatever backs them.
 *
 *   bundled → compiled into `src/generated/templates` at build time, so the
 *             serverless function never touches the filesystem.
 *   db      → TemplateFile rows written by the admin ZIP uploader.
 *   blob    → manifest + objects in Vercel Blob, for large imported libraries.
 *
 * All three return the same `TemplateFileRecord[]`.
 */

const memo = new Map<string, { at: number; files: TemplateFileRecord[] }>();
const TTL_MS = 60_000;

export type TemplateSource = Pick<
  Template,
  "id" | "slug" | "storage" | "sourceRef" | "entryFile"
>;

export async function loadTemplateFiles(template: TemplateSource): Promise<TemplateFileRecord[]> {
  const cacheKey = `${template.id}:${template.storage}:${template.sourceRef}`;
  const cached = memo.get(cacheKey);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.files;

  let files: TemplateFileRecord[];
  switch (template.storage) {
    case "db":
      files = await loadFromDatabase(template.id);
      break;
    case "blob":
      files = await loadFromBlob(template.sourceRef);
      break;
    default:
      files = loadBundled(template.sourceRef || template.slug);
  }

  memo.set(cacheKey, { at: Date.now(), files });
  return files;
}

export function loadBundled(ref: string): TemplateFileRecord[] {
  const bundle = bundledTemplates[ref];
  if (!bundle) return [];
  return Object.entries(bundle.files).map(([path, content]) => ({
    path,
    mimeType: mimeTypeFor(path),
    size: content.length,
    content,
  }));
}

async function loadFromDatabase(templateId: string): Promise<TemplateFileRecord[]> {
  const rows = await prisma.templateFile.findMany({
    where: { templateId },
    select: { path: true, mimeType: true, size: true, content: true, url: true },
  });
  return rows.map((row) => ({
    path: row.path,
    mimeType: row.mimeType,
    size: row.size,
    content: row.content ?? undefined,
    url: row.url ?? undefined,
  }));
}

type BlobManifest = { files: { path: string; url: string; size: number; mimeType: string }[] };

async function loadFromBlob(manifestUrl: string): Promise<TemplateFileRecord[]> {
  if (!manifestUrl) return [];
  try {
    const response = await fetch(manifestUrl, { next: { revalidate: 300 } });
    if (!response.ok) return [];
    const manifest = (await response.json()) as BlobManifest;

    // Text assets are inlined so patching/zipping never needs a second fetch.
    return await Promise.all(
      manifest.files.map(async (file) => {
        const isText = /^(text\/|image\/svg|application\/(json|xml|javascript))/.test(file.mimeType);
        if (!isText) {
          return { path: file.path, mimeType: file.mimeType, size: file.size, url: file.url };
        }
        const res = await fetch(file.url, { next: { revalidate: 300 } });
        return {
          path: file.path,
          mimeType: file.mimeType,
          size: file.size,
          content: res.ok ? await res.text() : "",
          url: file.url,
        };
      }),
    );
  } catch (error) {
    console.error("[templates] blob manifest load failed", error);
    return [];
  }
}

export async function readTemplateFile(
  template: TemplateSource,
  requestedPath: string,
): Promise<TemplateFileRecord | null> {
  const path = normalizeTemplatePath(requestedPath);
  if (!path) return null;
  const files = await loadTemplateFiles(template);
  return files.find((file) => file.path === path) ?? null;
}

export function htmlPagesOf(files: TemplateFileRecord[], entryFile: string): string[] {
  const pages = files.filter((file) => /\.html?$/i.test(file.path)).map((file) => file.path);
  return [entryFile, ...pages.filter((page) => page !== entryFile).sort()].filter((page) =>
    pages.includes(page),
  );
}

export function totalBytes(files: TemplateFileRecord[]): number {
  return files.reduce((sum, file) => sum + (file.size || file.content?.length || 0), 0);
}

/**
 * Resolves a slug straight from the compiled bundle.
 *
 * Used as the fallback when the database is unavailable, so previews keep
 * working in exactly the same situations the marketplace listing does.
 */
export function bundledTemplateSource(
  slug: string,
): (TemplateSource & { attribution: string | null }) | null {
  const entry = Object.entries(bundledTemplates).find(([, bundle]) => bundle.meta.slug === slug);
  if (!entry) return null;

  const [ref, bundle] = entry;
  return {
    id: `bundled:${ref}`,
    slug: bundle.meta.slug,
    storage: "bundled",
    sourceRef: ref,
    entryFile: bundle.meta.entryFile,
    attribution: bundle.meta.attribution ?? null,
  };
}

/** Bundled template metadata, used by the seeder and admin tooling. */
export function listBundledTemplates() {
  return Object.entries(bundledTemplates).map(([ref, bundle]) => ({
    ref,
    meta: bundle.meta,
    fileCount: Object.keys(bundle.files).length,
    bytes: Object.values(bundle.files).reduce((sum, content) => sum + content.length, 0),
  }));
}
