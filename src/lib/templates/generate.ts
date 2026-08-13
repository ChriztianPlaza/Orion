import { isHtmlFile, mimeTypeFor } from "@/lib/security/paths";
import { applyContentToHtml } from "./render";
import { loadTemplateFiles, type TemplateSource } from "./store";
import type { ProjectContent, ProjectMeta, ProjectTheme } from "./types";

/**
 * Turns a project into a self-contained static website.
 *
 * Everything the site needs ends up inside the output: template files with the
 * user's content applied, plus any images they uploaded — re-downloaded from
 * object storage into `assets/uploads/` and rewritten to relative paths. The
 * result runs from a file:// URL, a ZIP, or any static host with no Orion
 * runtime whatsoever.
 */

export type GeneratedFile = {
  path: string;
  bytes: Uint8Array;
  mimeType: string;
};

export type GenerateInput = {
  template: TemplateSource & { attribution?: string | null };
  content: ProjectContent;
  theme?: ProjectTheme;
  meta?: ProjectMeta;
};

const encoder = new TextEncoder();
const MAX_REMOTE_ASSET_BYTES = 15 * 1024 * 1024;

/**
 * Marketplace-only files that ship inside a template folder but are not part of
 * the website itself — the card poster. Excluded so a download contains only
 * what the user's site actually needs.
 */
const EXCLUDED_FROM_EXPORT = new Set(["thumbnail.svg", "template.json"]);

export async function generateSite(input: GenerateInput): Promise<GeneratedFile[]> {
  const templateFiles = await loadTemplateFiles(input.template);
  if (!templateFiles.length) {
    throw new Error("Template has no files. It may have been removed or is still importing.");
  }

  // 1. Pull uploaded/remote images referenced by the content map into the bundle.
  const { rewrites, assets } = await collectUploadedAssets(input.content);
  const content = rewriteContentUrls(input.content, rewrites);

  const output: GeneratedFile[] = [];

  // 2. Template files — HTML gets patched, everything else is copied verbatim.
  for (const file of templateFiles) {
    if (EXCLUDED_FROM_EXPORT.has(file.path)) continue;

    if (isHtmlFile(file.path)) {
      const source = file.content ?? (file.url ? await fetchText(file.url) : "");
      const html = applyContentToHtml(source, file.path, content, {
        mode: "export",
        theme: input.theme,
        meta: file.path === input.template.entryFile ? input.meta : undefined,
        attribution: input.template.attribution ?? null,
      });
      output.push({ path: file.path, bytes: encoder.encode(html), mimeType: "text/html" });
      continue;
    }

    if (typeof file.content === "string") {
      output.push({
        path: file.path,
        bytes: encoder.encode(file.content),
        mimeType: file.mimeType || mimeTypeFor(file.path),
      });
      continue;
    }

    if (file.url) {
      const bytes = await fetchBytes(file.url);
      if (bytes) {
        output.push({
          path: file.path,
          bytes,
          mimeType: file.mimeType || mimeTypeFor(file.path),
        });
      }
    }
  }

  // 3. Uploaded assets.
  output.push(...assets);

  return output;
}

async function collectUploadedAssets(content: ProjectContent) {
  const rewrites = new Map<string, string>();
  const assets: GeneratedFile[] = [];
  const seen = new Set<string>();
  let index = 0;

  const urls: string[] = [];
  for (const file of Object.values(content ?? {})) {
    for (const value of Object.values(file ?? {})) {
      if (typeof value?.src === "string" && /^https?:\/\//i.test(value.src)) {
        urls.push(value.src);
      }
    }
  }

  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);

    // Only bundle assets we host. Third-party hotlinks stay as absolute URLs so
    // we never mirror someone else's images into a user's download.
    if (!isOwnAsset(url)) continue;

    const bytes = await fetchBytes(url);
    if (!bytes) continue;

    const extension = guessExtension(url);
    const path = `assets/uploads/image-${++index}${extension}`;
    assets.push({ path, bytes, mimeType: mimeTypeFor(path) });
    rewrites.set(url, path);
  }

  return { rewrites, assets };
}

function isOwnAsset(url: string): boolean {
  return /\.public\.blob\.vercel-storage\.com\//i.test(url);
}

function guessExtension(url: string): string {
  const match = url.split("?")[0].match(/\.([a-z0-9]{2,5})$/i);
  return match ? `.${match[1].toLowerCase()}` : ".png";
}

function rewriteContentUrls(content: ProjectContent, rewrites: Map<string, string>): ProjectContent {
  if (!rewrites.size) return content;
  const out: ProjectContent = {};
  for (const [file, values] of Object.entries(content ?? {})) {
    const depth = file.split("/").length - 1;
    const prefix = depth > 0 ? "../".repeat(depth) : "";
    out[file] = {};
    for (const [key, value] of Object.entries(values ?? {})) {
      const replacement = value?.src ? rewrites.get(value.src) : undefined;
      out[file][key] = replacement ? { ...value, src: `${prefix}${replacement}` } : value;
    }
  }
  return out;
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_REMOTE_ASSET_BYTES) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_REMOTE_ASSET_BYTES) return null;
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok ? await response.text() : "";
  } catch {
    return "";
  }
}

export function totalGeneratedBytes(files: GeneratedFile[]): number {
  return files.reduce((sum, file) => sum + file.bytes.byteLength, 0);
}
