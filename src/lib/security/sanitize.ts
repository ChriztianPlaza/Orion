/**
 * Sanitisers for values that end up inside generated HTML.
 *
 * The generated site is static output the user owns, so we are not trying to
 * lock down what a *template* contains (that is handled by iframe sandboxing).
 * What we must guarantee is that a value typed into the editor can never break
 * out of its attribute or inject a script into someone else's project.
 */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/[\r\n\t]/g, " ");
}

const SAFE_URL_SCHEMES = ["http:", "https:", "mailto:", "tel:", "sms:"];

/**
 * Accepts absolute URLs with safe schemes, root/relative paths and fragments.
 * Rejects javascript:, data: (except images), vbscript: and control chars.
 */
export function sanitizeUrl(input: string, opts?: { allowDataImage?: boolean }): string {
  const value = input.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  if (!value) return "";

  if (/^(javascript|vbscript|file|about):/i.test(value)) return "";

  if (/^data:/i.test(value)) {
    if (opts?.allowDataImage && /^data:image\/(png|jpeg|jpg|gif|webp|avif|svg\+xml);/i.test(value)) {
      return value;
    }
    return "";
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    try {
      const url = new URL(value);
      return SAFE_URL_SCHEMES.includes(url.protocol) ? url.toString() : "";
    } catch {
      return "";
    }
  }

  // Relative path, root path or fragment.
  if (value.includes("\\")) return value.replace(/\\/g, "/");
  return value;
}

/** Strip every tag and event handler — used for plain-text editable nodes. */
export function stripTags(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\u00a0/g, " ")
    .trim();
}

/**
 * Allow-list based rich-text cleaner for inline formatting inside a heading or
 * paragraph. Anything not on the list is dropped, attributes included.
 */
const INLINE_ALLOWED = new Set([
  "b", "strong", "i", "em", "u", "s", "br", "span", "small", "sup", "sub", "mark",
]);

export function sanitizeInlineHtml(input: string): string {
  const withoutDangerous = input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  return withoutDangerous.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, rawTag: string) => {
    const tag = rawTag.toLowerCase();
    if (!INLINE_ALLOWED.has(tag)) return "";
    return match.startsWith("</") ? `</${tag}>` : `<${tag}>`;
  });
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTIONAL_COLOR =
  /^(rgb|rgba|hsl|hsla|oklch|lab|color)\(\s*[0-9a-z%.,\s/+-]+\)$/i;
const NAMED_COLOR = /^[a-z]{3,20}$/i;

export function sanitizeColor(input: string): string {
  const value = input.trim();
  if (HEX_COLOR.test(value) || FUNCTIONAL_COLOR.test(value) || NAMED_COLOR.test(value)) {
    return value;
  }
  return "";
}

/** CSS declaration value: no urls, no expressions, no closing braces. */
export function sanitizeCssValue(input: string): string {
  const value = input.trim().slice(0, 240);
  if (/[{}<>;@]/.test(value)) return "";
  if (/expression\s*\(|url\s*\(|@import|behavior\s*:/i.test(value)) return "";
  return value.replace(/[\u0000-\u001f]/g, "");
}

const SAFE_CSS_PROPS = new Set([
  "color", "background-color", "background", "background-image", "font-size",
  "font-weight", "font-family", "font-style", "line-height", "letter-spacing",
  "text-align", "text-transform", "text-decoration", "opacity", "border-radius",
  "border-color", "border-width", "border-style", "padding", "padding-top",
  "padding-right", "padding-bottom", "padding-left", "margin", "margin-top",
  "margin-right", "margin-bottom", "margin-left", "width", "max-width", "height",
  "min-height", "display", "gap", "box-shadow", "object-fit", "justify-content",
  "align-items", "flex-direction",
]);

export function sanitizeStyleMap(style: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rawProp, rawValue] of Object.entries(style)) {
    const prop = rawProp.trim().toLowerCase();
    if (!SAFE_CSS_PROPS.has(prop)) continue;
    if (typeof rawValue !== "string") continue;
    const value =
      prop.includes("color") || prop === "background"
        ? sanitizeColor(rawValue) || sanitizeCssValue(rawValue)
        : sanitizeCssValue(rawValue);
    if (value) out[prop] = value;
  }
  return out;
}

export function styleMapToCss(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([prop, value]) => `${prop}:${value}`)
    .join(";");
}

/** Cloudflare Pages project names: lowercase letters, digits and hyphens. */
export const PROJECT_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,56}[a-z0-9])$/;

export function validateProjectName(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = input.trim().toLowerCase();
  if (value.length < 3) return { ok: false, error: "Name must be at least 3 characters." };
  if (value.length > 58) return { ok: false, error: "Name must be 58 characters or fewer." };
  if (!PROJECT_NAME_PATTERN.test(value)) {
    return {
      ok: false,
      error: "Use lowercase letters, numbers and hyphens. Must start and end with a letter or number.",
    };
  }
  if (value.includes("--")) return { ok: false, error: "Consecutive hyphens are not allowed." };
  if (RESERVED_PROJECT_NAMES.has(value)) return { ok: false, error: "That name is reserved." };
  return { ok: true, value };
}

const RESERVED_PROJECT_NAMES = new Set([
  "www", "api", "admin", "app", "dashboard", "cdn", "assets", "static", "mail",
  "support", "help", "docs", "status", "blog", "orion", "cloudflare",
  "pages", "workers", "vercel", "stripe", "login", "signup", "account",
]);
