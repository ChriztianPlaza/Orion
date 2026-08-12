import JSZip from "jszip";
import { isTextAsset, mimeTypeFor, normalizeTemplatePath, UnsafePathError } from "@/lib/security/paths";
import { sniffImage } from "@/lib/storage/blob";

/**
 * Safe extraction of an uploaded template ZIP.
 *
 * Hostile archives are the main risk here: path traversal ("zip slip"), zip
 * bombs, executables disguised as assets. Every entry is normalised and size
 * checked, blocked extensions are dropped, and binary files must actually be
 * the image type their extension claims.
 */

export const ZIP_LIMITS = {
  maxArchiveBytes: 40 * 1024 * 1024,
  maxTotalUncompressedBytes: 120 * 1024 * 1024,
  maxFileBytes: 15 * 1024 * 1024,
  maxFiles: 400,
  /** Reject archives whose uncompressed size dwarfs the upload — a zip bomb. */
  maxCompressionRatio: 120,
};

export type ExtractedFile = {
  path: string;
  bytes: Uint8Array;
  mimeType: string;
  isText: boolean;
  text?: string;
};

export type ExtractResult = {
  files: ExtractedFile[];
  entryFile: string;
  pages: string[];
  skipped: string[];
  totalBytes: number;
};

export class TemplateArchiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateArchiveError";
  }
}

export async function extractTemplateArchive(archive: Uint8Array): Promise<ExtractResult> {
  if (archive.byteLength > ZIP_LIMITS.maxArchiveBytes) {
    throw new TemplateArchiveError(
      `The archive is larger than ${Math.round(ZIP_LIMITS.maxArchiveBytes / 1024 / 1024)} MB.`,
    );
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(archive);
  } catch {
    throw new TemplateArchiveError("That file is not a readable ZIP archive.");
  }

  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length === 0) throw new TemplateArchiveError("The archive is empty.");
  if (entries.length > ZIP_LIMITS.maxFiles) {
    throw new TemplateArchiveError(`Templates are limited to ${ZIP_LIMITS.maxFiles} files.`);
  }

  // Many archives wrap everything in a single top-level folder; strip it so
  // index.html ends up at the root.
  const prefix = commonPrefix(entries.map((entry) => entry.name));

  const files: ExtractedFile[] = [];
  const skipped: string[] = [];
  let totalBytes = 0;

  for (const entry of entries) {
    const relative = prefix ? entry.name.slice(prefix.length) : entry.name;

    let path: string | null;
    try {
      path = normalizeTemplatePath(relative);
    } catch (error) {
      if (error instanceof UnsafePathError) {
        throw new TemplateArchiveError(
          `The archive contains an unsafe path (${relative}). Upload was refused.`,
        );
      }
      throw error;
    }
    if (!path) {
      skipped.push(relative);
      continue;
    }

    const bytes = new Uint8Array(await entry.async("uint8array"));
    if (bytes.byteLength > ZIP_LIMITS.maxFileBytes) {
      skipped.push(`${path} (too large)`);
      continue;
    }

    totalBytes += bytes.byteLength;
    if (totalBytes > ZIP_LIMITS.maxTotalUncompressedBytes) {
      throw new TemplateArchiveError("The archive expands to more than the allowed size.");
    }

    const isText = isTextAsset(path);
    if (!isText) {
      // Binaries are limited to genuine images, fonts and media we recognise.
      const mime = mimeTypeFor(path);
      const isMedia = /^(image|font|video|audio)\//.test(mime) || mime === "application/pdf";
      if (!isMedia) {
        skipped.push(`${path} (unsupported type)`);
        continue;
      }
      if (mime.startsWith("image/") && !sniffImage(bytes)) {
        skipped.push(`${path} (not a real image)`);
        continue;
      }
    }

    files.push({
      path,
      bytes,
      mimeType: mimeTypeFor(path),
      isText,
      text: isText ? new TextDecoder().decode(bytes) : undefined,
    });
  }

  if (totalBytes / Math.max(1, archive.byteLength) > ZIP_LIMITS.maxCompressionRatio) {
    throw new TemplateArchiveError("That archive looks like a zip bomb and was refused.");
  }

  const htmlFiles = files.filter((file) => /\.html?$/i.test(file.path)).map((file) => file.path);
  if (htmlFiles.length === 0) {
    throw new TemplateArchiveError("No HTML file was found. A template needs at least an index.html.");
  }

  const entryFile =
    htmlFiles.find((path) => path === "index.html") ??
    htmlFiles.find((path) => path.endsWith("/index.html")) ??
    htmlFiles[0];

  return {
    files,
    entryFile,
    pages: [entryFile, ...htmlFiles.filter((path) => path !== entryFile).sort()],
    skipped,
    totalBytes,
  };
}

function commonPrefix(names: string[]): string {
  const roots = new Set(names.map((name) => name.split("/")[0]));
  if (roots.size !== 1) return "";
  const root = [...roots][0];
  // Only strip when every entry is genuinely inside that folder.
  return names.every((name) => name.startsWith(`${root}/`)) ? `${root}/` : "";
}
