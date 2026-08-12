import { parse, HTMLElement, NodeType } from "node-html-parser";
import type { EditableElement, EditableType } from "./types";

/**
 * Walks a template's HTML and produces the editable-element schema the editor
 * drives its sidebar from.
 *
 * Two addressing modes, in priority order:
 *   1. `data-editable="hero.title"` — authored templates opt in explicitly and
 *      keep stable keys across template updates.
 *   2. DOM ordinal (`e17`) — imported third-party templates get annotated
 *      automatically so *any* HTML works in the editor without hand-editing.
 *
 * The ordinal is assigned by a deterministic depth-first walk over element
 * nodes, so the same file always yields the same addresses.
 */

const TEXT_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "li", "blockquote", "figcaption", "label", "legend", "th", "td",
  "strong", "em", "small", "dt", "dd", "summary",
]);

const INLINE_TEXT_TAGS = new Set(["span", "div", "a", "button"]);

const SKIP_TAGS = new Set([
  "script", "style", "meta", "link", "head", "noscript", "svg", "path", "br", "hr",
  "source", "track", "param", "template", "iframe", "canvas",
]);

const SECTION_TAGS = new Set(["section", "header", "footer", "nav", "main", "aside", "article"]);

/** Text longer than this is almost certainly not a single editable label. */
const MAX_TEXT_LEN = 4000;

export type AnalyzeResult = {
  elements: EditableElement[];
  /** Ordinal -> element, for callers that immediately patch. */
  ordinalCount: number;
};

export function analyzeHtml(html: string, file: string): AnalyzeResult {
  const root = parse(html, {
    comment: false,
    voidTag: { closingSlash: true },
    blockTextElements: { script: true, noscript: true, style: true, pre: true },
  });

  const elements: EditableElement[] = [];
  let ordinal = 0;
  const usedKeys = new Set<string>();

  const walk = (node: HTMLElement, groupStack: string[]) => {
    for (const child of node.childNodes) {
      if (child.nodeType !== NodeType.ELEMENT_NODE) continue;
      const el = child as HTMLElement;
      const tag = el.rawTagName?.toLowerCase();
      if (!tag || SKIP_TAGS.has(tag)) continue;

      const currentOrdinal = ordinal++;
      const group = SECTION_TAGS.has(tag) ? [...groupStack, sectionLabel(el, tag)] : groupStack;

      const descriptor = describe(el, tag);
      if (descriptor) {
        const authored = el.getAttribute("data-editable");
        let key = authored?.trim() || `e${currentOrdinal}`;
        if (usedKeys.has(key)) key = `${key}-${currentOrdinal}`;
        usedKeys.add(key);

        elements.push({
          key,
          file,
          type: descriptor.type,
          label: descriptor.label,
          group: group[group.length - 1] ?? "Page",
          tag,
          ordinal: currentOrdinal,
          defaultText: descriptor.text,
          defaultSrc: descriptor.src,
          defaultHref: descriptor.href,
          defaultAlt: descriptor.alt,
          path: cssPath(el, tag),
        });
      }

      walk(el, group);
    }
  };

  const body = root.querySelector("body") ?? root;
  walk(body, ["Page"]);

  return { elements, ordinalCount: ordinal };
}

type Descriptor = {
  type: EditableType;
  label: string;
  text?: string;
  src?: string;
  href?: string;
  alt?: string;
};

function describe(el: HTMLElement, tag: string): Descriptor | null {
  const explicitType = el.getAttribute("data-editable-type") as EditableType | undefined;
  const explicitLabel = el.getAttribute("data-editable-label") ?? undefined;

  if (tag === "img") {
    const src = el.getAttribute("src") ?? "";
    return {
      type: "image",
      label: explicitLabel ?? (el.getAttribute("alt") || "Image"),
      src,
      alt: el.getAttribute("alt") ?? "",
    };
  }

  if (tag === "a" || tag === "button") {
    const text = directText(el);
    // A link wrapping only an image is handled by the image itself.
    if (!text && !explicitType) return null;
    return {
      type: explicitType ?? (tag === "button" || looksLikeButton(el) ? "button" : "link"),
      label: explicitLabel ?? truncateLabel(text || "Link"),
      text,
      href: el.getAttribute("href") ?? "",
    };
  }

  const bgUrl = backgroundImageUrl(el.getAttribute("style"));
  if (bgUrl) {
    return {
      type: "background",
      label: explicitLabel ?? "Background image",
      src: bgUrl,
    };
  }

  if (TEXT_TAGS.has(tag) || (INLINE_TEXT_TAGS.has(tag) && hasOnlyText(el))) {
    const text = directText(el);
    if (!text || text.length > MAX_TEXT_LEN) return null;
    if (!explicitType && !/[\p{L}\p{N}]/u.test(text)) return null;
    return {
      type: explicitType ?? (containsInlineMarkup(el) ? "richtext" : "text"),
      label: explicitLabel ?? truncateLabel(text),
      text,
    };
  }

  if (explicitType === "section" || (SECTION_TAGS.has(tag) && el.getAttribute("data-editable"))) {
    return { type: "section", label: explicitLabel ?? sectionLabel(el, tag) };
  }

  return null;
}

/** Concatenated text of direct + nested inline children, whitespace collapsed. */
function directText(el: HTMLElement): string {
  return el.text.replace(/\s+/g, " ").trim();
}

function hasOnlyText(el: HTMLElement): boolean {
  const childElements = el.childNodes.filter((n) => n.nodeType === NodeType.ELEMENT_NODE);
  if (childElements.length === 0) return el.text.trim().length > 0;
  return childElements.every((n) => {
    const tag = (n as HTMLElement).rawTagName?.toLowerCase();
    return tag ? ["b", "strong", "i", "em", "u", "span", "small", "br", "mark"].includes(tag) : false;
  });
}

function containsInlineMarkup(el: HTMLElement): boolean {
  return el.childNodes.some(
    (n) =>
      n.nodeType === NodeType.ELEMENT_NODE &&
      ["b", "strong", "i", "em", "u", "mark", "span"].includes(
        (n as HTMLElement).rawTagName?.toLowerCase() ?? "",
      ),
  );
}

function looksLikeButton(el: HTMLElement): boolean {
  const cls = (el.getAttribute("class") ?? "").toLowerCase();
  return /\b(btn|button|cta)\b/.test(cls);
}

function backgroundImageUrl(style: string | undefined): string | null {
  if (!style) return null;
  const match = style.match(/background(?:-image)?\s*:\s*[^;]*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
  return match?.[1] ?? null;
}

function sectionLabel(el: HTMLElement, tag: string): string {
  const id = el.getAttribute("id");
  if (id) return humanize(id);
  const cls = (el.getAttribute("class") ?? "").split(/\s+/)[0];
  if (cls && cls.length < 24) return humanize(cls);
  return humanize(tag);
}

function humanize(value: string): string {
  const clean = value.replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function truncateLabel(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 44 ? `${clean.slice(0, 43)}…` : clean || "Text";
}

function cssPath(el: HTMLElement, tag: string): string {
  const id = el.getAttribute("id");
  if (id) return `#${id}`;
  const cls = (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).slice(0, 2);
  return cls.length ? `${tag}.${cls.join(".")}` : tag;
}

/**
 * Discovers the pages of a template: the entry file plus any HTML the entry
 * links to, keeping only files that exist in the bundle.
 */
export function discoverPages(files: string[], entryFile: string): string[] {
  const htmlFiles = files.filter((f) => /\.html?$/i.test(f));
  const ordered = [entryFile, ...htmlFiles.filter((f) => f !== entryFile).sort()];
  return [...new Set(ordered)].filter((f) => htmlFiles.includes(f));
}
