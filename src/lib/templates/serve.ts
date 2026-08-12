import { isHtmlFile, mimeTypeFor, normalizeTemplatePath } from "@/lib/security/paths";
import { applyContentToHtml, type RenderMode } from "./render";
import { loadTemplateFiles, type TemplateSource } from "./store";
import type { ProjectContent, ProjectMeta, ProjectTheme } from "./types";

/**
 * Serves template files into a sandboxed preview frame.
 *
 * Templates are untrusted third-party HTML/JS. The response carries a
 * `Content-Security-Policy: sandbox …` header *without* `allow-same-origin`, so
 * the browser gives the document an opaque origin: it cannot read our cookies,
 * localStorage, or reach into the parent page. It can still postMessage to the
 * editor, which is all the bridge needs.
 */

const SANDBOX_CSP = "sandbox allow-scripts allow-popups allow-forms allow-modals allow-downloads";

export type ServeOptions = {
  mode: RenderMode;
  baseHref: string;
  content?: ProjectContent;
  theme?: ProjectTheme;
  meta?: ProjectMeta;
  attribution?: string | null;
  cacheSeconds?: number;
  /**
   * Thumbnail mode, used by the marketplace grid where two dozen previews share
   * one page. See `toThumbnail` — it is what keeps that page from crawling.
   */
  thumbnail?: boolean;
};

const THUMBNAIL_STYLE =
  "<style>*,*::before,*::after{animation:none!important;transition:none!important}" +
  "[data-reveal]{opacity:1!important;transform:none!important}" +
  "html{scrollbar-width:none}::-webkit-scrollbar{display:none}</style>";

/**
 * Strips a preview down to what a 400px-wide card actually shows.
 *
 * A full template costs a webfont stylesheet, its font files, half a dozen
 * full-resolution photographs and a scroll-reveal script. Multiply that by the
 * cards on one marketplace page and the browser has a very bad time. In
 * thumbnail mode we drop the scripts, drop the webfonts, and ask the image host
 * for card-sized images instead of hero-sized ones — the result looks the same
 * at 28% scale and costs roughly a tenth as much.
 */
function toThumbnail(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/?>/gi, "")
    .replace(/<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>/gi, "")
    .replace(/(picsum\.photos\/seed\/[^/"'\s]+)\/\d+\/\d+/gi, "$1/480/320")
    .replace(/<\/head>/i, `${THUMBNAIL_STYLE}</head>`);
}

export async function serveTemplateAsset(
  template: TemplateSource & { attribution?: string | null },
  requestedPath: string | undefined,
  options: ServeOptions,
): Promise<Response> {
  const rawPath = requestedPath?.length ? requestedPath : template.entryFile;
  const filePath = normalizeTemplatePath(rawPath);
  if (!filePath) return notFound();

  const files = await loadTemplateFiles(template);
  if (!files.length) return notFound("Template files are unavailable.");

  const file = files.find((candidate) => candidate.path === filePath);
  if (!file) {
    // Directory-style request: /about/ -> /about/index.html
    const indexCandidate = files.find((candidate) => candidate.path === `${filePath}/index.html`);
    if (!indexCandidate) return notFound();
    return serveFile(indexCandidate.content ?? "", indexCandidate.path, template, options);
  }

  if (file.url && typeof file.content !== "string") {
    // Binary asset held in object storage — redirect rather than proxy bytes.
    return Response.redirect(file.url, 307);
  }

  return serveFile(file.content ?? "", file.path, template, options);
}

function serveFile(
  contents: string,
  filePath: string,
  template: TemplateSource & { attribution?: string | null },
  options: ServeOptions,
): Response {
  const headers = new Headers({
    "Content-Type": mimeTypeFor(filePath),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": options.cacheSeconds
      ? `public, max-age=0, s-maxage=${options.cacheSeconds}, stale-while-revalidate=600`
      : "no-store",
  });

  if (!isHtmlFile(filePath)) {
    return new Response(contents, { headers });
  }

  headers.set("Content-Security-Policy", SANDBOX_CSP);

  const html = applyContentToHtml(contents, filePath, options.content ?? {}, {
    mode: options.mode,
    baseHref: options.baseHref,
    theme: options.theme,
    meta: filePath === template.entryFile ? options.meta : undefined,
    attribution: template.attribution ?? options.attribution ?? null,
  });

  return new Response(options.thumbnail ? toThumbnail(html) : html, { headers });
}

function notFound(message = "Not found") {
  return new Response(message, {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
