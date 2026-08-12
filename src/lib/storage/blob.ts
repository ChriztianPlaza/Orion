import { put, del, type PutBlobResult } from "@vercel/blob";
import { env, isBlobConfigured } from "@/lib/env";
import { extensionOf } from "@/lib/security/paths";

/**
 * Object storage for user uploads and imported template bundles.
 *
 * Vercel Blob keeps the Vercel deployment story simple (no bucket, no IAM, no
 * region). Everything goes through this module so swapping in S3/R2 later means
 * reimplementing three functions.
 */

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Object storage is not configured. Set BLOB_READ_WRITE_TOKEN.");
    this.name = "StorageNotConfiguredError";
  }
}

/** Magic-number sniffing — never trust a client-supplied MIME type. */
const SIGNATURES: { mime: string; ext: string; test: (bytes: Uint8Array) => boolean }[] = [
  {
    mime: "image/png",
    ext: "png",
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/gif",
    ext: "gif",
    test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  },
  {
    mime: "image/webp",
    ext: "webp",
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  {
    mime: "image/avif",
    ext: "avif",
    test: (b) =>
      b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 &&
      b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 && b[11] === 0x66,
  },
];

export type SniffResult = { mime: string; ext: string } | null;

export function sniffImage(bytes: Uint8Array): SniffResult {
  if (bytes.length < 16) return null;
  for (const signature of SIGNATURES) {
    if (signature.test(bytes)) return { mime: signature.mime, ext: signature.ext };
  }

  // SVG is text; accept only when it parses as an <svg> root and carries no
  // script or event handlers.
  const head = new TextDecoder().decode(bytes.slice(0, 1024)).toLowerCase();
  if (head.includes("<svg")) {
    const full = new TextDecoder().decode(bytes).toLowerCase();
    const hostile =
      full.includes("<script") ||
      full.includes("javascript:") ||
      /\son\w+\s*=/.test(full) ||
      full.includes("<foreignobject");
    if (!hostile) return { mime: "image/svg+xml", ext: "svg" };
  }

  return null;
}

export async function uploadObject(input: {
  pathname: string;
  bytes: Uint8Array | string;
  contentType: string;
  cacheSeconds?: number;
}): Promise<PutBlobResult> {
  if (!isBlobConfigured()) throw new StorageNotConfiguredError();

  return put(input.pathname, input.bytes as never, {
    access: "public",
    contentType: input.contentType,
    token: env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: true,
    cacheControlMaxAge: input.cacheSeconds ?? 31_536_000,
  });
}

export async function deleteObject(url: string): Promise<void> {
  if (!isBlobConfigured()) return;
  await del(url, { token: env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
}

export function safeUploadName(original: string, ext: string): string {
  const base = original
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .toLowerCase();
  const stem = base || "image";
  return `${stem}.${ext || extensionOf(original) || "bin"}`;
}
