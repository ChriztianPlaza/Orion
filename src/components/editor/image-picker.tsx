"use client";

import * as React from "react";
import { ImagePlus, Link2, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldHint } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatBytes } from "@/lib/utils";

type Asset = {
  id: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
};

export function ImagePicker({
  projectId,
  value,
  onChange,
  onClear,
}: {
  projectId: string;
  value: string;
  onChange: (url: string) => void;
  onClear?: () => void;
}) {
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [urlDraft, setUrlDraft] = React.useState("");
  const [showLibrary, setShowLibrary] = React.useState(false);

  const loadAssets = React.useCallback(async () => {
    try {
      const response = await fetch("/api/uploads");
      if (!response.ok) return;
      const payload = await response.json();
      setAssets(payload.assets ?? []);
    } catch {
      // library is a convenience; failing to load it is not an error worth showing
    }
  }, []);

  React.useEffect(() => {
    if (showLibrary) void loadAssets();
  }, [showLibrary, loadAssets]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("projectId", projectId);

      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast({
          variant: "error",
          title: "Upload failed",
          description: payload.message ?? "That image could not be uploaded.",
        });
        return;
      }

      onChange(payload.asset.url);
      setAssets((current) => [payload.asset, ...current]);
      toast({ variant: "success", title: "Image uploaded" });
    } catch {
      toast({ variant: "error", title: "Upload failed", description: "Check your connection." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {value && (
        <div className="relative overflow-hidden rounded-xl border border-hairline bg-white/[0.03]">
          <img src={value} alt="" className="h-28 w-full object-cover" />
          {onClear && (
            <button
              onClick={onClear}
              className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-ink backdrop-blur transition-colors hover:bg-black/80 hover:text-white"
              aria-label="Remove image"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={() => setShowLibrary((v) => !v)}
        >
          <ImagePlus /> Library
        </Button>
      </div>

      {showLibrary && (
        <div className="rounded-xl border border-hairline bg-white/[0.02] p-2">
          {assets.length === 0 ? (
            <p className="px-1 py-3 text-center text-[12px] text-ink-muted">
              Nothing uploaded yet.
            </p>
          ) : (
            <div className="grid max-h-48 grid-cols-3 gap-1.5 overflow-y-auto">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => onChange(asset.url)}
                  title={`${asset.name} · ${formatBytes(asset.size)}`}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-hairline transition-colors hover:border-white/30"
                >
                  <img src={asset.url} alt={asset.name} className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="image-url">Or paste an image URL</Label>
        <div className="flex gap-2">
          <Input
            id="image-url"
            value={urlDraft}
            onChange={(event) => setUrlDraft(event.target.value)}
            placeholder="https://…"
            className="h-9 text-[13px]"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!urlDraft.trim()) return;
              onChange(urlDraft.trim());
              setUrlDraft("");
            }}
          >
            <Link2 />
          </Button>
        </div>
        <FieldHint>
          Uploaded images are bundled into your download. External URLs stay as links.
        </FieldHint>
      </div>
    </div>
  );
}
