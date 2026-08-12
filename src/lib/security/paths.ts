/**
 * Path handling for untrusted template file names.
 *
 * Every template path — bundled, ZIP-uploaded or imported from GitHub — passes
 * through here before it is used to read, write, zip or upload anything.
 */

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/** Extensions we refuse to store or serve from a template bundle. */
const BLOCKED_EXTENSIONS = new Set([
  "php", "php3", "php4", "php5", "phtml", "phar",
  "jsp", "jspx", "asp", "aspx", "ashx", "cshtml",
  "exe", "dll", "so", "dylib", "bat", "cmd", "com", "msi", "scr",
  "sh", "bash", "zsh", "ps1", "psm1", "py", "rb", "pl", "cgi",
  "jar", "war", "class",
  "htaccess", "htpasswd",
  "env", "pem", "key", "p12", "pfx",
]);

/** Directories that never belong in a published template. */
const BLOCKED_SEGMENTS = new Set([
  ".git", ".github", ".svn", ".hg", "node_modules", ".next",
  "__macosx", ".vscode", ".idea", ".vercel",
]);

export class UnsafePathError extends Error {
  constructor(path: string, reason: string) {
    super(`Unsafe path "${path}": ${reason}`);
    this.name = "UnsafePathError";
  }
}

/**
 * Normalise a relative path from an untrusted source.
 * Returns null when the entry should be dropped (dotfile, junk, blocked type).
 * Throws for actively hostile input (traversal, absolute, NUL byte).
 */
export function normalizeTemplatePath(input: string): string | null {
  if (!input) return null;
  if (input.includes("\0")) throw new UnsafePathError(input, "NUL byte");

  let path = input.replace(/\\/g, "/").trim();

  // Strip zip-slip style prefixes and drive letters.
  if (/^[a-zA-Z]:/.test(path)) throw new UnsafePathError(input, "drive letter");
  if (path.startsWith("//")) throw new UnsafePathError(input, "UNC path");
  path = path.replace(/^\/+/, "");
  if (!path || path.endsWith("/")) return null; // directory entry

  const segments: string[] = [];
  for (const raw of path.split("/")) {
    const segment = raw.trim();
    if (!segment || segment === ".") continue;
    if (segment === "..") throw new UnsafePathError(input, "traversal");
    if (BLOCKED_SEGMENTS.has(segment.toLowerCase())) return null;
    if (segment.startsWith(".")) return null; // .DS_Store, .env, dotfolders
    if (WINDOWS_RESERVED.test(segment)) return null;
    if (segment.length > 128) throw new UnsafePathError(input, "segment too long");
    segments.push(segment);
  }

  if (!segments.length) return null;
  if (segments.length > 12) throw new UnsafePathError(input, "too deep");

  const normalized = segments.join("/");
  if (normalized.length > 400) throw new UnsafePathError(input, "path too long");

  const ext = extensionOf(normalized);
  if (ext && BLOCKED_EXTENSIONS.has(ext)) return null;

  return normalized;
}

export function extensionOf(path: string): string {
  const base = path.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

const MIME_BY_EXT: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  bmp: "image/bmp",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
  pdf: "application/pdf",
  webmanifest: "application/manifest+json",
};

export function mimeTypeFor(path: string): string {
  return MIME_BY_EXT[extensionOf(path)] ?? "application/octet-stream";
}

const TEXT_EXTENSIONS = new Set([
  "html", "htm", "css", "js", "mjs", "json", "txt", "md", "xml", "svg",
  "webmanifest", "csv",
]);

export function isTextAsset(path: string): boolean {
  return TEXT_EXTENSIONS.has(extensionOf(path));
}

export function isHtmlFile(path: string): boolean {
  const ext = extensionOf(path);
  return ext === "html" || ext === "htm";
}

/** Resolve `href` relative to the html file it appeared in. */
export function resolveRelative(fromFile: string, href: string): string | null {
  if (!href) return null;
  if (/^([a-z]+:)?\/\//i.test(href)) return null; // absolute / protocol-relative
  if (/^(data|mailto|tel|javascript|blob):/i.test(href)) return null;
  if (href.startsWith("#")) return null;

  const clean = href.split(/[?#]/)[0];
  if (!clean) return null;

  const base = clean.startsWith("/")
    ? []
    : fromFile.split("/").slice(0, -1);
  const out: string[] = [...base];

  for (const segment of clean.replace(/^\/+/, "").split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (!out.length) return null;
      out.pop();
      continue;
    }
    out.push(segment);
  }
  return out.join("/") || null;
}
