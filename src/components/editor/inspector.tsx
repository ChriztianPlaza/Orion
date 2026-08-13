"use client";

import * as React from "react";
import { Eye, EyeOff, RotateCcw, Type as TypeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ImagePicker } from "./image-picker";
import { EDITABLE_TYPE_LABEL, type EditableElement, type EditableValue } from "@/lib/templates/types";

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px", "48px", "56px", "64px", "80px"];
const FONT_WEIGHTS = [
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extrabold" },
];
const ALIGNMENTS = ["left", "center", "right"];

/**
 * Contextual controls for whatever is selected in the preview.
 *
 * Every control writes into the project's content map — never into the template
 * files — so the original template stays pristine and any edit can be reset.
 */
export function Inspector({
  projectId,
  element,
  value,
  onChange,
  onReset,
}: {
  projectId: string;
  element: EditableElement | null;
  value: EditableValue;
  onChange: (patch: EditableValue, options?: { merge?: boolean }) => void;
  onReset: () => void;
}) {
  if (!element) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-white/[0.05] text-ink-dim">
          <TypeIcon className="size-[18px]" />
        </span>
        <p className="mt-4 text-[13.5px] font-medium text-ink">Nothing selected</p>
        <p className="mt-1.5 max-w-[26ch] text-[12.5px] leading-relaxed text-ink-muted">
          Click any heading, image, button or block in the preview to edit it here.
        </p>
      </div>
    );
  }

  const style = value.style ?? {};
  const setStyle = (patch: Record<string, string | undefined>, merge = true) => {
    const next = { ...style };
    for (const [key, entry] of Object.entries(patch)) {
      if (entry === undefined || entry === "") delete next[key];
      else next[key] = entry;
    }
    onChange({ style: next }, { merge });
  };

  const isTextual = ["text", "richtext", "link", "button"].includes(element.type);
  const isImage = element.type === "image" || element.type === "background";
  const isLink = element.type === "link" || element.type === "button";

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-hairline px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium text-white">{element.label}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-dim">
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                {EDITABLE_TYPE_LABEL[element.type]}
              </Badge>
              <span className="font-mono">{element.tag}</span>
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onReset} title="Reset to the template default">
            <RotateCcw />
            <span className="sr-only">Reset</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {isTextual && (
          <section>
            <Label htmlFor="insp-text">Text</Label>
            <Textarea
              id="insp-text"
              value={value.text ?? element.defaultText ?? ""}
              onChange={(event) => onChange({ text: event.target.value }, { merge: true })}
              rows={3}
              className="text-[13px]"
            />
          </section>
        )}

        {isImage && (
          <section>
            <Label>{element.type === "background" ? "Background image" : "Image"}</Label>
            <ImagePicker
              projectId={projectId}
              value={value.src ?? element.defaultSrc ?? ""}
              onChange={(url) => onChange({ src: url })}
              onClear={() => onChange({ src: undefined })}
            />
            {element.type === "image" && (
              <div className="mt-4">
                <Label htmlFor="insp-alt">Alt text</Label>
                <Input
                  id="insp-alt"
                  value={value.alt ?? element.defaultAlt ?? ""}
                  onChange={(event) => onChange({ alt: event.target.value }, { merge: true })}
                  placeholder="Describe the image"
                  className="h-9 text-[13px]"
                />
                <FieldHint>Read aloud by screen readers and shown if the image fails to load.</FieldHint>
              </div>
            )}
          </section>
        )}

        {isLink && (
          <section className="space-y-3">
            <div>
              <Label htmlFor="insp-href">Link</Label>
              <Input
                id="insp-href"
                value={value.href ?? element.defaultHref ?? ""}
                onChange={(event) => onChange({ href: event.target.value }, { merge: true })}
                placeholder="https://example.com, #section or about.html"
                className="h-9 text-[13px]"
              />
            </div>
            <div>
              <Label htmlFor="insp-target">Opens in</Label>
              <Select
                id="insp-target"
                value={value.target ?? "_self"}
                onChange={(event) => onChange({ target: event.target.value })}
                className="h-9 text-[13px]"
              >
                <option value="_self">Same tab</option>
                <option value="_blank">New tab</option>
              </Select>
            </div>
          </section>
        )}

        <section className="space-y-3 border-t border-hairline pt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-dim">Style</p>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label htmlFor="insp-color">Colour</Label>
              <ColorField
                id="insp-color"
                value={style.color ?? ""}
                onChange={(color) => setStyle({ color })}
              />
            </div>
            <div>
              <Label htmlFor="insp-bg">Background</Label>
              <ColorField
                id="insp-bg"
                value={style["background-color"] ?? ""}
                onChange={(color) => setStyle({ "background-color": color })}
              />
            </div>
          </div>

          {isTextual && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label htmlFor="insp-size">Size</Label>
                  <Select
                    id="insp-size"
                    value={style["font-size"] ?? ""}
                    onChange={(event) => setStyle({ "font-size": event.target.value }, false)}
                    className="h-9 text-[13px]"
                  >
                    <option value="">Template default</option>
                    {FONT_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="insp-weight">Weight</Label>
                  <Select
                    id="insp-weight"
                    value={style["font-weight"] ?? ""}
                    onChange={(event) => setStyle({ "font-weight": event.target.value }, false)}
                    className="h-9 text-[13px]"
                  >
                    <option value="">Default</option>
                    {FONT_WEIGHTS.map((weight) => (
                      <option key={weight.value} value={weight.value}>
                        {weight.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label>Alignment</Label>
                <div className="flex gap-1">
                  {ALIGNMENTS.map((align) => (
                    <button
                      key={align}
                      onClick={() =>
                        setStyle({ "text-align": style["text-align"] === align ? undefined : align }, false)
                      }
                      aria-pressed={style["text-align"] === align}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-[12px] capitalize transition-colors ${
                        style["text-align"] === align
                          ? "border-hairline-strong bg-white/10 text-white"
                          : "border-hairline text-ink-muted hover:text-white"
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>

        <section className="border-t border-hairline pt-4">
          <button
            onClick={() => onChange({ hidden: !value.hidden })}
            className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-[13px] text-ink-muted transition-colors hover:text-white"
          >
            <span className="flex items-center gap-2">
              {value.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {value.hidden ? "Hidden on the site" : "Visible on the site"}
            </span>
            <span
              className={`relative h-5 w-9 rounded-full transition-colors ${
                value.hidden ? "bg-white/10" : "bg-[#30d158]/70"
              }`}
            >
              <span
                className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
                  value.hidden ? "left-0.5" : "left-[18px]"
                }`}
              />
            </span>
          </button>
          <FieldHint>Hidden elements are removed from the exported files.</FieldHint>
        </section>
      </div>
    </div>
  );
}

function ColorField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const isHex = /^#[0-9a-f]{6}$/i.test(value);

  return (
    <div className="flex items-center gap-1.5">
      <label
        className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-[10px] border border-hairline"
        style={{ background: value || "transparent" }}
      >
        <input
          type="color"
          value={isHex ? value : "#ffffff"}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Pick a colour"
        />
        {!value && (
          <span
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(45deg,rgba(255,255,255,.1) 25%,transparent 25%,transparent 75%,rgba(255,255,255,.1) 75%)",
              backgroundSize: "8px 8px",
            }}
          />
        )}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Default"
        className="h-9 font-mono text-[12px]"
      />
    </div>
  );
}
