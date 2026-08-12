"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Crown, Eye, Search, Star, Trash2, Unlock, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn, relativeTime } from "@/lib/utils";

export type AdminTemplateRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  tier: string;
  featured: boolean;
  storage: string;
  usageCount: number;
  viewCount: number;
  fileCount: number;
  license: string;
  author: string | null;
  updatedAt: string;
  categoryName: string | null;
};

type Filters = { search: string; status: string; tier: string; category: string };

export function TemplateManager({
  templates,
  categories,
  total,
  matching,
  page,
  perPage,
  counts,
  filters,
}: {
  templates: AdminTemplateRow[];
  categories: { slug: string; name: string }[];
  total: number;
  matching: number;
  page: number;
  perPage: number;
  counts: { free: number; pro: number };
  filters: Filters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { toast } = useToast();

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<AdminTemplateRow | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState(filters.search);

  const pageCount = Math.max(1, Math.ceil(matching / perPage));
  const visibleIds = templates.map((template) => template.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const setParam = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === "all") next.delete(key);
        else next.set(key, value);
      }
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  // Debounced search so typing does not fire a query per keystroke.
  React.useEffect(() => {
    if (search === filters.search) return;
    const timer = setTimeout(() => setParam({ q: search || null }), 350);
    return () => clearTimeout(timer);
  }, [search, filters.search, setParam]);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const patchOne = async (template: AdminTemplateRow, body: Record<string, unknown>) => {
    setBusy(template.id);
    try {
      const response = await fetch(`/api/admin/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({ variant: "error", title: "Update failed", description: payload.message });
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const bulk = async (field: "tier" | "status" | "featured", value: string | boolean) => {
    if (selected.size === 0) return;
    setBusy("bulk");
    try {
      const response = await fetch("/api/admin/templates/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value, ids: [...selected] }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast({ variant: "error", title: "Bulk update failed", description: payload.message });
        return;
      }
      toast({ variant: "success", title: payload.message });
      setSelected(new Set());
      router.refresh();
    } catch {
      toast({ variant: "error", title: "Network error", description: "Please try again." });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(pendingDelete.id);
    try {
      const response = await fetch(`/api/admin/templates/${pendingDelete.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({ variant: "error", title: "Delete failed", description: payload.message });
        return;
      }
      toast({
        variant: payload.disabled ? "info" : "success",
        title: payload.disabled ? "Template disabled" : "Template deleted",
        description: payload.message,
      });
      setPendingDelete(null);
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const hasFilters =
    Boolean(filters.search) ||
    filters.status !== "all" ||
    filters.tier !== "all" ||
    filters.category !== "all";

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.025em]">
            Templates
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13.5px] text-white/40">
            {total} in the marketplace
            <button
              onClick={() => setParam({ tier: filters.tier === "FREE" ? null : "FREE" })}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[12px] transition-colors",
                filters.tier === "FREE"
                  ? "border-[#30d158]/40 bg-[#30d158]/10 text-[#30d158]"
                  : "border-white/10 text-white/45 hover:text-white",
              )}
            >
              {counts.free} free
            </button>
            <button
              onClick={() => setParam({ tier: filters.tier === "PRO" ? null : "PRO" })}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[12px] transition-colors",
                filters.tier === "PRO"
                  ? "border-[#0071e3]/40 bg-[#0071e3]/12 text-[#2997ff]"
                  : "border-white/10 text-white/45 hover:text-white",
              )}
            >
              {counts.pro} pro
            </button>
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload /> Upload template
        </Button>
      </div>

      {/* ─────────────────────────────────────────────────────────── filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/25" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or slug…"
            className="h-10 pl-9"
            aria-label="Search templates"
          />
        </div>

        <Select
          value={filters.tier}
          onChange={(event) => setParam({ tier: event.target.value })}
          className="h-10 w-[140px]"
          aria-label="Filter by tier"
        >
          <option value="all">All tiers</option>
          <option value="FREE">Free only</option>
          <option value="PRO">Pro only</option>
        </Select>

        <Select
          value={filters.status}
          onChange={(event) => setParam({ status: event.target.value })}
          className="h-10 w-[150px]"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="DISABLED">Disabled</option>
        </Select>

        <Select
          value={filters.category}
          onChange={(event) => setParam({ category: event.target.value })}
          className="h-10 w-[170px]"
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              router.push(pathname);
            }}
          >
            <X /> Clear
          </Button>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────── bulk bar */}
      {selected.size > 0 && (
        <div
          className="glass sticky top-16 z-30 mb-3 flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3"
          role="region"
          aria-label="Bulk actions"
        >
          <span className="text-[13.5px] font-medium text-white">
            {selected.size} selected
          </span>

          <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />

          <Button
            size="sm"
            variant="secondary"
            disabled={busy === "bulk"}
            onClick={() => bulk("tier", "PRO")}
          >
            <Crown /> Set Pro only
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy === "bulk"}
            onClick={() => bulk("tier", "FREE")}
          >
            <Unlock /> Set Free
          </Button>

          <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />

          <Button
            size="sm"
            variant="ghost"
            disabled={busy === "bulk"}
            onClick={() => bulk("status", "PUBLISHED")}
          >
            Publish
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy === "bulk"}
            onClick={() => bulk("status", "DISABLED")}
          >
            Disable
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy === "bulk"}
            onClick={() => bulk("featured", true)}
          >
            <Star /> Feature
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => setSelected(new Set())}
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── table */}
      <div className="card-surface overflow-x-auto rounded-[18px]">
        <table className="w-full min-w-[880px] text-[13.5px]">
          <thead>
            <tr className="border-b border-white/[0.07] text-left text-white/35">
              <th scope="col" className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  aria-label="Select all templates on this page"
                  className="size-3.5 cursor-pointer accent-white"
                />
              </th>
              <th scope="col" className="px-4 py-3 font-medium">Template</th>
              <th scope="col" className="px-4 py-3 font-medium">Category</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Access</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Used</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Views</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => {
              const isSelected = selected.has(template.id);
              return (
                <tr
                  key={template.id}
                  className={cn(
                    "border-b border-white/[0.05] last:border-0 transition-colors",
                    isSelected && "bg-white/[0.04]",
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(template.id)}
                      aria-label={`Select ${template.name}`}
                      className="size-3.5 cursor-pointer accent-white"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {template.featured && (
                        <Star className="size-3.5 shrink-0 fill-[#ffd60a] text-[#ffd60a]" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{template.name}</p>
                        <p className="truncate font-mono text-[11.5px] text-white/30">
                          {template.slug} · {template.fileCount} files ·{" "}
                          {relativeTime(template.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/55">{template.categoryName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={template.status}
                      onChange={(event) => patchOne(template, { status: event.target.value })}
                      disabled={busy === template.id}
                      className="h-8 w-[124px] text-[12.5px]"
                      aria-label={`Status for ${template.name}`}
                    >
                      <option value="PUBLISHED">Published</option>
                      <option value="DRAFT">Draft</option>
                      <option value="DISABLED">Disabled</option>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={template.tier}
                      onChange={(event) => patchOne(template, { tier: event.target.value })}
                      disabled={busy === template.id}
                      className={cn(
                        "h-8 w-[112px] text-[12.5px]",
                        template.tier === "PRO" && "text-[#2997ff]",
                      )}
                      aria-label={`Access for ${template.name}`}
                    >
                      <option value="FREE">Free</option>
                      <option value="PRO">Pro only</option>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right text-white/55">{template.usageCount}</td>
                  <td className="px-4 py-3 text-right text-white/55">{template.viewCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => patchOne(template, { featured: !template.featured })}
                        disabled={busy === template.id}
                        title={template.featured ? "Unfeature" : "Feature"}
                      >
                        <Star className={template.featured ? "fill-[#ffd60a] text-[#ffd60a]" : ""} />
                        <span className="sr-only">Toggle featured</span>
                      </Button>
                      <Link href={`/templates/${template.slug}`} target="_blank">
                        <Button variant="ghost" size="icon-sm" title="Preview">
                          <Eye />
                          <span className="sr-only">Preview</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setPendingDelete(template)}
                        title="Delete"
                        className="text-[#ff6961]"
                      >
                        <Trash2 />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {templates.length === 0 && (
          <p className="py-14 text-center text-[13.5px] text-white/30">
            No templates match those filters.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-white/35">
        <span>
          Showing {templates.length} of {matching}
          {matching !== total ? ` filtered (${total} total)` : ""}
        </span>

        {pageCount > 1 && (
          <nav className="flex items-center gap-2" aria-label="Template pagination">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                const next = new URLSearchParams(params.toString());
                next.set("page", String(page - 1));
                router.push(`${pathname}?${next.toString()}`);
              }}
            >
              Previous
            </Button>
            <span className="px-1">
              Page {page} of {pageCount}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => {
                const next = new URLSearchParams(params.toString());
                next.set("page", String(page + 1));
                router.push(`${pathname}?${next.toString()}`);
              }}
            >
              Next
            </Button>
          </nav>
        )}
      </div>

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        categories={categories}
        onUploaded={() => {
          setUploadOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={remove}
        loading={busy === pendingDelete?.id}
        title="Delete this template?"
        description={
          <>
            <strong className="text-white">{pendingDelete?.name}</strong> will be removed from the
            marketplace. If any projects still use it, it is disabled instead so those projects keep
            working.
          </>
        }
      />
    </>
  );
}

function UploadDialog({
  open,
  onClose,
  categories,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  categories: { slug: string; name: string }[];
  onUploaded: () => void;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({ variant: "error", title: "Attach a ZIP archive first" });
      return;
    }

    const data = new FormData(event.currentTarget);
    data.set("file", file);

    setUploading(true);
    try {
      const response = await fetch("/api/admin/templates", { method: "POST", body: data });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast({ variant: "error", title: "Upload failed", description: payload.message });
        return;
      }

      toast({
        variant: "success",
        title: "Template uploaded",
        description: `${payload.files} files stored${
          payload.skipped?.length ? `, ${payload.skipped.length} skipped` : ""
        }.${payload.warning ? ` ${payload.warning}` : ""}`,
      });
      formRef.current?.reset();
      setFile(null);
      onUploaded();
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Upload a template"
      description="A ZIP containing index.html plus its CSS, JavaScript and assets. Paths are validated and dangerous file types are dropped."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={() => formRef.current?.requestSubmit()} loading={uploading}>
            Upload template
          </Button>
        </>
      }
    >
      <form ref={formRef} onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="tpl-file">Archive</Label>
          <input
            id="tpl-file"
            type="file"
            accept=".zip,application/zip"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white/60 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1 file:text-[12px] file:font-medium file:text-black"
          />
          <FieldHint>Up to 40 MB, 400 files. Executable and server-side file types are refused.</FieldHint>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="tpl-name">Name</Label>
            <Input id="tpl-name" name="name" required maxLength={120} placeholder="Modern SaaS" />
          </div>
          <div>
            <Label htmlFor="tpl-slug">Slug</Label>
            <Input id="tpl-slug" name="slug" maxLength={120} placeholder="auto from name" />
          </div>
        </div>

        <div>
          <Label htmlFor="tpl-description">Description</Label>
          <Textarea id="tpl-description" name="description" rows={2} maxLength={600} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="tpl-category">Category</Label>
            <Select id="tpl-category" name="category" defaultValue="">
              <option value="">Uncategorised</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="tpl-tier">Access</Label>
            <Select id="tpl-tier" name="tier" defaultValue="FREE">
              <option value="FREE">Free — anyone can use it</option>
              <option value="PRO">Pro only — subscribers</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="tpl-scheme">Colour scheme</Label>
            <Select id="tpl-scheme" name="colorScheme" defaultValue="dark">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="colorful">Colourful</option>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="tpl-tags">Tags</Label>
          <Input id="tpl-tags" name="tags" placeholder="startup, dark, minimal" />
          <FieldHint>Comma separated, up to twelve.</FieldHint>
        </div>

        <fieldset className="rounded-xl border border-white/[0.08] p-4">
          <legend className="px-1.5 text-[12px] text-white/40">Licensing and attribution</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="tpl-license">License</Label>
              <Input id="tpl-license" name="license" required defaultValue="MIT" maxLength={60} />
            </div>
            <div>
              <Label htmlFor="tpl-author">Author</Label>
              <Input id="tpl-author" name="author" maxLength={120} />
            </div>
          </div>
          <div className="mt-3">
            <Label htmlFor="tpl-source">Source URL</Label>
            <Input id="tpl-source" name="source" type="url" maxLength={400} placeholder="https://github.com/…" />
          </div>
          <div className="mt-3">
            <Label htmlFor="tpl-attribution">Required attribution</Label>
            <Input
              id="tpl-attribution"
              name="attribution"
              maxLength={400}
              placeholder="Design by … , used under CC BY 4.0"
            />
            <FieldHint>
              Shown on the template page and preserved as a comment in every export and deployment.
            </FieldHint>
          </div>
        </fieldset>
      </form>
    </Dialog>
  );
}
