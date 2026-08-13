"use client";

import * as React from "react";
import {
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Layers,
  Link2,
  Palette,
  Search,
  Settings2,
  SquareMousePointer,
  Type as TypeIcon,
} from "lucide-react";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EditableElement, EditableType, ProjectMeta, ProjectTheme } from "@/lib/templates/types";

export type SchemaPage = { file: string; elementCount: number; elements: EditableElement[] };

type Tab = "pages" | "elements" | "theme" | "settings";

const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: "pages", label: "Pages", icon: FileText },
  { id: "elements", label: "Elements", icon: Layers },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "settings", label: "Settings", icon: Settings2 },
];

const TYPE_ICON: Partial<Record<EditableType, typeof TypeIcon>> = {
  text: TypeIcon,
  richtext: TypeIcon,
  image: ImageIcon,
  background: ImageIcon,
  link: Link2,
  button: SquareMousePointer,
};

const TYPE_FILTERS: { id: "all" | EditableType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "text", label: "Text" },
  { id: "image", label: "Images" },
  { id: "button", label: "Buttons" },
  { id: "link", label: "Links" },
];

export function EditorSidebar({
  pages,
  activeFile,
  onSelectFile,
  elements,
  selectedKey,
  onSelectElement,
  editedKeys,
  theme,
  onThemeChange,
  meta,
  onMetaChange,
  projectName,
  onProjectNameChange,
}: {
  pages: SchemaPage[];
  activeFile: string;
  onSelectFile: (file: string) => void;
  elements: EditableElement[];
  selectedKey: string | null;
  onSelectElement: (element: EditableElement) => void;
  editedKeys: Set<string>;
  theme: ProjectTheme;
  onThemeChange: (patch: Partial<ProjectTheme>, options?: { merge?: boolean }) => void;
  meta: ProjectMeta;
  onMetaChange: (patch: Partial<ProjectMeta>, options?: { merge?: boolean }) => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
}) {
  const [tab, setTab] = React.useState<Tab>("elements");
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | EditableType>("all");

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return elements.filter((element) => {
      if (typeFilter !== "all") {
        const matchesType =
          typeFilter === "text"
            ? element.type === "text" || element.type === "richtext"
            : typeFilter === "image"
              ? element.type === "image" || element.type === "background"
              : element.type === typeFilter;
        if (!matchesType) return false;
      }
      if (!needle) return true;
      return `${element.label} ${element.group} ${element.tag}`.toLowerCase().includes(needle);
    });
  }, [elements, search, typeFilter]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, EditableElement[]>();
    for (const element of filtered) {
      const list = map.get(element.group) ?? [];
      list.push(element);
      map.set(element.group, list);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="flex h-full flex-col bg-[#070707]">
      <nav
        className="grid grid-cols-4 border-b border-hairline"
        role="tablist"
        aria-label="Editor panels"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[10.5px] transition-colors",
              tab === item.id
                ? "bg-white/[0.05] text-white"
                : "text-ink-muted hover:bg-white/[0.02] hover:text-ink",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "pages" && (
        <div className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-dim">
            Pages in this template
          </p>
          <ul className="space-y-1">
            {pages.map((page) => (
              <li key={page.file}>
                <button
                  onClick={() => onSelectFile(page.file)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                    activeFile === page.file
                      ? "bg-white/[0.08] text-white"
                      : "text-ink-muted hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="size-3.5 shrink-0 opacity-50" />
                    <span className="truncate">{page.file}</span>
                  </span>
                  <span className="ml-2 shrink-0 text-[11px] text-ink-dim">
                    {page.elementCount}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <FieldHint className="px-1">
            Every page is exported together. Links between them keep working.
          </FieldHint>
        </div>
      )}

      {tab === "elements" && (
        <>
          <div className="space-y-2.5 border-b border-hairline p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-dim" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find an element…"
                className="h-8 pl-8 text-[12.5px]"
                aria-label="Search elements"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {TYPE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setTypeFilter(filter.id)}
                  aria-pressed={typeFilter === filter.id}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11.5px] transition-colors",
                    typeFilter === filter.id
                      ? "bg-white text-black"
                      : "bg-white/[0.05] text-ink-muted hover:text-white",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            {grouped.length === 0 ? (
              <p className="px-2 py-8 text-center text-[12.5px] text-ink-dim">
                No elements match that search.
              </p>
            ) : (
              grouped.map(([group, items]) => (
                <details key={group} open className="group mb-1">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-dim hover:text-ink-muted">
                    <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
                    {group}
                    <span className="ml-auto text-ink-dim">{items.length}</span>
                  </summary>
                  <ul className="mt-0.5 space-y-px">
                    {items.map((element) => {
                      const Icon = TYPE_ICON[element.type] ?? Layers;
                      const edited = editedKeys.has(element.key);
                      return (
                        <li key={element.key}>
                          <button
                            onClick={() => onSelectElement(element)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors",
                              selectedKey === element.key
                                ? "bg-[#0071e3]/15 text-white"
                                : "text-ink-muted hover:bg-white/[0.04] hover:text-white",
                            )}
                          >
                            <Icon className="size-3.5 shrink-0 opacity-45" />
                            <span className="truncate">{element.label}</span>
                            {edited && (
                              <span
                                className="ml-auto size-1.5 shrink-0 rounded-full bg-[#2997ff]"
                                title="Edited"
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ))
            )}
          </div>
        </>
      )}

      {tab === "theme" && (
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-dim">
              Site colours
            </p>
            <div className="space-y-3">
              <ThemeColor
                label="Accent"
                variable="--accent"
                theme={theme}
                onChange={onThemeChange}
              />
              <ThemeColor
                label="Page background"
                variable="--bg"
                theme={theme}
                onChange={onThemeChange}
              />
              <ThemeColor label="Text" variable="--ink" theme={theme} onChange={onThemeChange} />
              <ThemeColor
                label="Muted text"
                variable="--ink-muted"
                theme={theme}
                onChange={onThemeChange}
              />
            </div>
            <FieldHint>
              These override the template&apos;s CSS variables. Leave blank to keep the original
              design.
            </FieldHint>
          </div>

          <div className="border-t border-hairline pt-4">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-dim">
              Typography
            </p>
            <Label htmlFor="theme-body-font">Body font</Label>
            <Select
              id="theme-body-font"
              value={theme.fontFamily ?? ""}
              onChange={(event) => onThemeChange({ fontFamily: event.target.value || undefined })}
              className="h-9 text-[13px]"
            >
              <option value="">Template default</option>
              {FONT_STACKS.map((font) => (
                <option key={font.label} value={font.value}>
                  {font.label}
                </option>
              ))}
            </Select>

            <div className="mt-3">
              <Label htmlFor="theme-heading-font">Heading font</Label>
              <Select
                id="theme-heading-font"
                value={theme.headingFont ?? ""}
                onChange={(event) => onThemeChange({ headingFont: event.target.value || undefined })}
                className="h-9 text-[13px]"
              >
                <option value="">Template default</option>
                {FONT_STACKS.map((font) => (
                  <option key={font.label} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="mt-3">
              <Label htmlFor="theme-radius">Corner radius</Label>
              <Select
                id="theme-radius"
                value={theme.radius ?? ""}
                onChange={(event) => onThemeChange({ radius: event.target.value || undefined })}
                className="h-9 text-[13px]"
              >
                <option value="">Template default</option>
                <option value="0px">Square</option>
                <option value="6px">Subtle</option>
                <option value="12px">Rounded</option>
                <option value="20px">Soft</option>
                <option value="999px">Pill</option>
              </Select>
            </div>
          </div>

          <div className="border-t border-hairline pt-4">
            <Label htmlFor="theme-css">Custom CSS</Label>
            <Textarea
              id="theme-css"
              value={theme.customCss ?? ""}
              onChange={(event) => onThemeChange({ customCss: event.target.value }, { merge: true })}
              rows={6}
              spellCheck={false}
              placeholder={".hero h1 { letter-spacing: -0.04em; }"}
              className="font-mono text-[12px]"
            />
            <FieldHint>Appended last, so it wins over the template&apos;s own styles.</FieldHint>
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <Label htmlFor="set-name">Project name</Label>
            <Input
              id="set-name"
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              maxLength={80}
              className="h-9 text-[13px]"
            />
            <FieldHint>Only you see this. It names the ZIP you download.</FieldHint>
          </div>

          <div className="border-t border-hairline pt-4">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-dim">
              Search and social
            </p>
            <Label htmlFor="set-title">Page title</Label>
            <Input
              id="set-title"
              value={meta.title ?? ""}
              onChange={(event) => onMetaChange({ title: event.target.value }, { merge: true })}
              placeholder="Shown in the browser tab and search results"
              maxLength={120}
              className="h-9 text-[13px]"
            />

            <div className="mt-3">
              <Label htmlFor="set-description">Description</Label>
              <Textarea
                id="set-description"
                value={meta.description ?? ""}
                onChange={(event) => onMetaChange({ description: event.target.value }, { merge: true })}
                rows={3}
                maxLength={320}
                placeholder="One or two sentences describing the page"
                className="text-[13px]"
              />
              <FieldHint>{(meta.description ?? "").length}/320 characters</FieldHint>
            </div>

            <div className="mt-3">
              <Label htmlFor="set-favicon">Favicon URL</Label>
              <Input
                id="set-favicon"
                value={meta.favicon ?? ""}
                onChange={(event) => onMetaChange({ favicon: event.target.value }, { merge: true })}
                placeholder="https://…/icon.png"
                className="h-9 text-[13px]"
              />
            </div>

            <div className="mt-3">
              <Label htmlFor="set-og">Social share image URL</Label>
              <Input
                id="set-og"
                value={meta.ogImage ?? ""}
                onChange={(event) => onMetaChange({ ogImage: event.target.value }, { merge: true })}
                placeholder="https://…/share.png"
                className="h-9 text-[13px]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const FONT_STACKS = [
  { label: "System sans", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { label: "Inter", value: "'Inter', -apple-system, sans-serif" },
  { label: "Georgia serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Monospace", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  { label: "Helvetica", value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
];

function ThemeColor({
  label,
  variable,
  theme,
  onChange,
}: {
  label: string;
  variable: string;
  theme: ProjectTheme;
  onChange: (patch: Partial<ProjectTheme>, options?: { merge?: boolean }) => void;
}) {
  const value = theme.vars?.[variable] ?? "";
  const isHex = /^#[0-9a-f]{6}$/i.test(value);

  return (
    <div className="flex items-center gap-2.5">
      <label
        className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-hairline"
        style={{ background: value || "transparent" }}
      >
        <input
          type="color"
          value={isHex ? value : "#ffffff"}
          onChange={(event) => onChange({ vars: { [variable]: event.target.value } }, { merge: true })}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={`${label} colour`}
        />
      </label>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-ink">{label}</p>
        <p className="truncate font-mono text-[11px] text-ink-dim">{value || "template default"}</p>
      </div>
      {value && (
        <button
          onClick={() => onChange({ vars: { [variable]: "" } })}
          className="text-[11px] text-ink-dim hover:text-white"
        >
          Reset
        </button>
      )}
    </div>
  );
}
