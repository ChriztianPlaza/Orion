/**
 * Template + editor state contracts.
 *
 * Design rule: the editor never stores HTML. It stores a *content map* of
 * addressable values. Generating the site re-applies that map onto the pristine
 * template files, so the output is always plain static HTML/CSS/JS with no
 * runtime dependency on Orion.
 */

export type EditableType =
  | "text" // plain text node (headings, paragraphs, labels)
  | "richtext" // inline formatting allowed
  | "image" // <img src>
  | "background" // element background-image
  | "link" // <a href>
  | "button" // <a>/<button> with label + href
  | "icon"
  | "section"; // whole block: visibility + ordering

export type EditableElement = {
  /** Stable address. Author-provided `data-editable` key, else `e<ordinal>`. */
  key: string;
  /** File the element lives in, e.g. "index.html". */
  file: string;
  type: EditableType;
  /** Human label shown in the editor sidebar. */
  label: string;
  /** Sidebar grouping — usually the enclosing section id/class. */
  group: string;
  tag: string;
  /** Original value, used for reset + placeholder display. */
  defaultText?: string;
  defaultSrc?: string;
  defaultHref?: string;
  defaultAlt?: string;
  /** DOM ordinal used to re-locate the node deterministically. */
  ordinal: number;
  /** Best-effort CSS path, for debugging and screen-reader labels. */
  path?: string;
};

export type EditableValue = {
  text?: string;
  html?: string;
  src?: string;
  alt?: string;
  href?: string;
  target?: string;
  hidden?: boolean;
  style?: Record<string, string>;
};

/** content[file][key] = value */
export type ProjectContent = Record<string, Record<string, EditableValue>>;

export type ProjectTheme = {
  /** CSS custom properties injected as a :root override. */
  vars?: Record<string, string>;
  fontFamily?: string;
  headingFont?: string;
  radius?: string;
  /** Free-form CSS appended last. Sanitised on write. */
  customCss?: string;
};

export type ProjectMeta = {
  title?: string;
  description?: string;
  favicon?: string;
  ogImage?: string;
  lang?: string;
};

export type TemplateFileRecord = {
  path: string;
  mimeType: string;
  size: number;
  /** Text payload for html/css/js/svg. */
  content?: string;
  /** Remote URL for binaries (blob storage or upstream raw). */
  url?: string;
  /** In-memory binary payload — only used during import/upload. */
  bytes?: Uint8Array;
};

export type TemplateBundle = {
  slug: string;
  entryFile: string;
  files: TemplateFileRecord[];
  editableElements: EditableElement[];
};

export type TemplatePage = {
  path: string;
  label: string;
  isEntry: boolean;
};

export const EDITABLE_TYPE_LABEL: Record<EditableType, string> = {
  text: "Text",
  richtext: "Rich text",
  image: "Image",
  background: "Background",
  link: "Link",
  button: "Button",
  icon: "Icon",
  section: "Section",
};
