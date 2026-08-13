import { parse, HTMLElement, NodeType } from "node-html-parser";
import { analyzeHtml } from "./analyze";
import {
  escapeHtml,
  sanitizeColor,
  sanitizeCssValue,
  sanitizeInlineHtml,
  sanitizeStyleMap,
  sanitizeUrl,
  styleMapToCss,
} from "@/lib/security/sanitize";
import type { EditableValue, ProjectContent, ProjectMeta, ProjectTheme } from "./types";

export type RenderMode = "export" | "preview" | "editor";

export type RenderOptions = {
  mode: RenderMode;
  /** Injected as <base href>, so relative assets resolve under the API route. */
  baseHref?: string;
  theme?: ProjectTheme;
  meta?: ProjectMeta;
  /** Credit line required by an upstream template license. */
  attribution?: string | null;
};

const SKIP_TAGS = new Set([
  "script", "style", "meta", "link", "head", "noscript", "svg", "path", "br", "hr",
  "source", "track", "param", "template", "iframe", "canvas",
]);

/**
 * Applies the project's content map to one HTML file.
 *
 * Walks elements in exactly the same deterministic order `analyzeHtml` uses, so
 * ordinal keys line up. Author keys (`data-editable`) win when present.
 */
export function applyContentToHtml(
  html: string,
  file: string,
  content: ProjectContent,
  options: RenderOptions,
): string {
  const values = content?.[file] ?? {};

  // In editor mode only genuinely editable nodes become click targets. Tagging
  // every element would let the user select a layout div the sidebar has no
  // entry for, which reads as a broken selection.
  const editableKeys =
    options.mode === "editor"
      ? new Set(analyzeHtml(html, file).elements.map((element) => element.key))
      : null;

  const root = parse(html, {
    comment: true,
    voidTag: { closingSlash: true },
    blockTextElements: { script: true, noscript: true, style: true, pre: true },
  });

  // Pass one: number every element exactly the way `analyzeHtml` does, without
  // touching the tree. Mutating mid-walk would shift the ordinals of everything
  // after a removed or rewritten node, so a single hidden section could silently
  // re-address the rest of the page.
  const numbered: { el: HTMLElement; tag: string; key: string; ordinalKey: string }[] = [];
  let ordinal = 0;

  const number = (node: HTMLElement) => {
    for (const child of node.childNodes) {
      if (child.nodeType !== NodeType.ELEMENT_NODE) continue;
      const el = child as HTMLElement;
      const tag = el.rawTagName?.toLowerCase();
      if (!tag || SKIP_TAGS.has(tag)) continue;

      const ordinalKey = `e${ordinal++}`;
      const authored = el.getAttribute("data-editable")?.trim();
      numbered.push({ el, tag, key: authored || ordinalKey, ordinalKey });

      number(el);
    }
  };

  const body = root.querySelector("body") ?? root;
  number(body);

  // Pass two: apply the content map. Order no longer matters.
  for (const { el, tag, key, ordinalKey } of numbered) {
    const value = values[key] ?? (key === ordinalKey ? undefined : values[ordinalKey]);

    if (value) {
      const removed = applyValue(el, tag, value);
      if (removed) continue;
    }

    if (editableKeys) {
      if (editableKeys.has(key)) {
        el.setAttribute("data-orion-key", key);
        el.setAttribute("data-orion-tag", tag);
      }
    } else {
      el.removeAttribute("data-editable-type");
      el.removeAttribute("data-editable-label");
    }
  }

  let output = root.toString();
  output = injectHead(output, options);
  if (options.mode === "editor") output = injectEditorBridge(output);
  return output;
}

/** Returns true when the element was removed from the tree. */
function applyValue(el: HTMLElement, tag: string, value: EditableValue): boolean {
  if (value.hidden) {
    el.remove();
    return true;
  }

  if (typeof value.src === "string") {
    const src = sanitizeUrl(value.src, { allowDataImage: true });
    if (src) {
      if (tag === "img") {
        el.setAttribute("src", src);
        el.removeAttribute("srcset");
        el.removeAttribute("data-src");
      } else {
        const existing = el.getAttribute("style") ?? "";
        const withoutBg = existing.replace(/background(-image)?\s*:[^;]*;?/gi, "").trim();
        const separator = withoutBg && !withoutBg.endsWith(";") ? ";" : "";
        el.setAttribute(
          "style",
          `${withoutBg}${separator}background-image:url('${src.replace(/'/g, "%27")}')`,
        );
      }
    }
  }

  if (typeof value.alt === "string") {
    el.setAttribute("alt", escapeHtml(value.alt).slice(0, 300));
  }

  if (typeof value.href === "string") {
    const href = sanitizeUrl(value.href);
    if (href) el.setAttribute("href", href);
  }

  if (typeof value.target === "string" && ["_blank", "_self"].includes(value.target)) {
    el.setAttribute("target", value.target);
    if (value.target === "_blank") el.setAttribute("rel", "noopener noreferrer");
  }

  if (typeof value.html === "string") {
    el.set_content(sanitizeInlineHtml(value.html));
  } else if (typeof value.text === "string") {
    el.set_content(escapeHtml(value.text));
  }

  if (value.style && Object.keys(value.style).length) {
    const safe = sanitizeStyleMap(value.style);
    if (Object.keys(safe).length) {
      const existing = el.getAttribute("style")?.trim() ?? "";
      const separator = existing && !existing.endsWith(";") ? ";" : "";
      el.setAttribute("style", `${existing}${separator}${styleMapToCss(safe)}`);
    }
  }

  return false;
}

/** Build the theme override stylesheet from the project's theme object. */
export function buildThemeCss(theme?: ProjectTheme): string {
  if (!theme) return "";
  const declarations: string[] = [];

  for (const [rawName, rawValue] of Object.entries(theme.vars ?? {})) {
    const name = rawName.trim().toLowerCase();
    if (!/^--[a-z0-9-]{1,60}$/.test(name)) continue;
    const value = sanitizeColor(String(rawValue)) || sanitizeCssValue(String(rawValue));
    if (value) declarations.push(`${name}:${value}`);
  }

  if (theme.radius) {
    const radius = sanitizeCssValue(theme.radius);
    if (radius) declarations.push(`--sc-radius:${radius}`);
  }

  const blocks: string[] = [];
  if (declarations.length) blocks.push(`:root{${declarations.join(";")}}`);

  const bodyFont = theme.fontFamily ? sanitizeCssValue(theme.fontFamily) : "";
  if (bodyFont) blocks.push(`body{font-family:${bodyFont} !important}`);

  const headingFont = theme.headingFont ? sanitizeCssValue(theme.headingFont) : "";
  if (headingFont) {
    blocks.push(`h1,h2,h3,h4,h5,h6{font-family:${headingFont} !important}`);
  }

  if (theme.customCss) {
    // Only structural characters that could escape a <style> block are stripped.
    blocks.push(theme.customCss.replace(/<\/?\s*(style|script)/gi, ""));
  }

  return blocks.join("\n");
}

function injectHead(html: string, options: RenderOptions): string {
  const parts: string[] = [];

  if (options.baseHref) {
    parts.push(`<base href="${escapeHtml(options.baseHref)}">`);
  }

  const meta = options.meta;
  if (meta?.description) {
    parts.push(`<meta name="description" content="${escapeHtml(meta.description)}">`);
  }
  if (meta?.favicon) {
    const favicon = sanitizeUrl(meta.favicon, { allowDataImage: true });
    if (favicon) parts.push(`<link rel="icon" href="${escapeHtml(favicon)}">`);
  }
  if (meta?.ogImage) {
    const ogImage = sanitizeUrl(meta.ogImage, { allowDataImage: true });
    if (ogImage) parts.push(`<meta property="og:image" content="${escapeHtml(ogImage)}">`);
  }
  if (meta?.title) {
    parts.push(`<meta property="og:title" content="${escapeHtml(meta.title)}">`);
  }

  const themeCss = buildThemeCss(options.theme);
  if (themeCss) parts.push(`<style data-orion-theme>${themeCss}</style>`);

  let output = html;

  if (meta?.title) {
    const title = escapeHtml(meta.title);
    output = /<title>[\s\S]*?<\/title>/i.test(output)
      ? output.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
      : output.replace(/<head([^>]*)>/i, `<head$1><title>${title}</title>`);
  }

  if (options.attribution && options.mode === "export") {
    parts.push(`<!-- ${options.attribution.replace(/--+/g, "-")} -->`);
  }

  if (!parts.length) return output;

  const injection = parts.join("");
  if (/<head[^>]*>/i.test(output)) {
    // <base> must come first to affect every later relative URL.
    return output.replace(/<head([^>]*)>/i, `<head$1>${injection}`);
  }
  if (/<html[^>]*>/i.test(output)) {
    return output.replace(/<html([^>]*)>/i, `<html$1><head>${injection}</head>`);
  }
  return `<head>${injection}</head>${output}`;
}

/**
 * The editor bridge. Runs *inside* the sandboxed preview frame, which has an
 * opaque origin — it can post messages out but cannot touch app cookies,
 * storage or DOM. Never included in exported output.
 */
function injectEditorBridge(html: string): string {
  const script = `
<script data-orion-bridge>
(function () {
  var selected = null;
  function payload(el) {
    var rect = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return {
      key: el.getAttribute('data-orion-key'),
      tag: (el.getAttribute('data-orion-tag') || el.tagName).toLowerCase(),
      text: (el.textContent || '').trim().slice(0, 5000),
      src: el.getAttribute('src') || '',
      alt: el.getAttribute('alt') || '',
      href: el.getAttribute('href') || '',
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontFamily: cs.fontFamily,
      textAlign: cs.textAlign,
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
    };
  }
  function send(type, data) { parent.postMessage({ source: 'orion-preview', type: type, data: data }, '*'); }

  document.addEventListener('mouseover', function (e) {
    var el = e.target.closest('[data-orion-key]');
    document.querySelectorAll('.orion-hover').forEach(function (n) { n.classList.remove('orion-hover'); });
    if (el) el.classList.add('orion-hover');
  }, true);

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-orion-key]');
    e.preventDefault();
    e.stopPropagation();
    if (!el) { send('deselect', null); return; }
    if (selected) selected.classList.remove('orion-selected');
    selected = el;
    el.classList.add('orion-selected');
    send('select', payload(el));
  }, true);

  window.addEventListener('message', function (e) {
    var msg = e.data;
    if (!msg || msg.source !== 'orion-editor') return;
    if (msg.type === 'patch') {
      var el = document.querySelector('[data-orion-key="' + CSS.escape(msg.key) + '"]');
      if (!el) return;
      var v = msg.value || {};
      if (typeof v.text === 'string') el.textContent = v.text;
      if (typeof v.src === 'string' && el.tagName === 'IMG') el.setAttribute('src', v.src);
      if (typeof v.alt === 'string') el.setAttribute('alt', v.alt);
      if (typeof v.href === 'string' && el.tagName === 'A') el.setAttribute('href', v.href);
      if (v.hidden === true) el.style.display = 'none';
      if (v.hidden === false) el.style.removeProperty('display');
      if (v.style) for (var p in v.style) el.style.setProperty(p, v.style[p]);
    }
    if (msg.type === 'scrollTo') {
      var target = document.querySelector('[data-orion-key="' + CSS.escape(msg.key) + '"]');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (msg.type === 'theme') {
      var tag = document.querySelector('style[data-orion-theme]');
      if (!tag) { tag = document.createElement('style'); tag.setAttribute('data-orion-theme', ''); document.head.appendChild(tag); }
      tag.textContent = msg.css || '';
    }
  });

  document.addEventListener('submit', function (e) { e.preventDefault(); }, true);

  function ready() {
    send('ready', { count: document.querySelectorAll('[data-orion-key]').length, height: document.body.scrollHeight });
  }
  if (document.readyState === 'complete') ready();
  else window.addEventListener('load', ready);
})();
</script>
<style data-orion-bridge-style>
  [data-orion-key] { transition: outline-color .12s ease; }
  .orion-hover { outline: 1.5px dashed rgba(41,151,255,.85) !important; outline-offset: 2px; cursor: pointer; }
  .orion-selected { outline: 2px solid #2997ff !important; outline-offset: 2px; }
</style>`;

  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${script}</body>`);
  return html + script;
}
