"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ScrollRow } from "@/components/ui/scroll-row";
import { cn } from "@/lib/utils";
import type { CategorySummary } from "@/lib/templates/queries";

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "popular", label: "Most popular" },
  { value: "newest", label: "Newest" },
  { value: "az", label: "A — Z" },
];

const TIERS = [
  { value: "all", label: "All templates" },
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
];

const SCHEMES = [
  { value: "all", label: "Any style" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "colorful", label: "Colourful" },
];

export function TemplateFilters({
  categories,
  total,
}: {
  categories: CategorySummary[];
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [search, setSearch] = React.useState(params.get("q") ?? "");

  const activeCategory = params.get("category") ?? "all";
  const activeSort = params.get("sort") ?? "recommended";
  const activeTier = params.get("tier") ?? "all";
  const activeScheme = params.get("scheme") ?? "all";
  const hasFilters =
    activeCategory !== "all" || activeTier !== "all" || activeScheme !== "all" || Boolean(params.get("q"));

  const update = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === "all") next.delete(key);
        else next.set(key, value);
      }
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  // Debounced search so typing does not fire a request per keystroke.
  React.useEffect(() => {
    const current = params.get("q") ?? "";
    if (search === current) return;
    const timer = setTimeout(() => update({ q: search || null }), 320);
    return () => clearTimeout(timer);
  }, [search, params, update]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-dim" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search templates, categories or tags…"
            className="h-11 pl-10"
            aria-label="Search templates"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-ink-dim hover:text-white"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select
          value={activeSort}
          onChange={(event) => update({ sort: event.target.value })}
          className="h-11 w-[170px]"
          aria-label="Sort templates"
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Button
          variant={showAdvanced ? "secondary" : "outline"}
          size="md"
          className="h-11"
          onClick={() => setShowAdvanced((value) => !value)}
          aria-expanded={showAdvanced}
        >
          <SlidersHorizontal /> Filters
        </Button>
      </div>

      {showAdvanced && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-hairline bg-white/[0.02] p-3">
          <Select
            value={activeTier}
            onChange={(event) => update({ tier: event.target.value })}
            className="h-10 w-[160px]"
            aria-label="Filter by plan"
          >
            {TIERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            value={activeScheme}
            onChange={(event) => update({ scheme: event.target.value })}
            className="h-10 w-[160px]"
            aria-label="Filter by colour scheme"
          >
            {SCHEMES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                router.push(pathname, { scroll: false });
              }}
            >
              <X /> Clear all
            </Button>
          )}
          <span className="ml-auto text-[13px] text-ink-dim">
            {total} {total === 1 ? "template" : "templates"}
          </span>
        </div>
      )}

      <ScrollRow label="Categories">
        <CategoryChip
          label="All"
          count={categories.reduce((sum, c) => sum + c.count, 0)}
          active={activeCategory === "all"}
          onClick={() => update({ category: null })}
        />
        {categories.map((category) => (
          <CategoryChip
            key={category.slug}
            label={category.name}
            count={category.count}
            active={activeCategory === category.slug}
            onClick={() => update({ category: category.slug })}
          />
        ))}
      </ScrollRow>
    </div>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition-all duration-300",
        active
          ? "border-hairline-strong bg-white text-black"
          : "border-hairline text-ink-muted hover:border-hairline-strong hover:text-white",
      )}
    >
      {label}
      {/* black/40 on the white active chip was 2.9:1 — /60 clears AA at 5.7:1 */}
      <span className={cn("ml-1.5", active ? "text-black/60" : "text-ink-dim")}>{count}</span>
    </button>
  );
}
