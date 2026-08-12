import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TemplateCardItem } from "@/components/templates/template-card";
import { TemplateFilters } from "@/components/templates/template-filters";
import { listCategories, listTemplates, type TemplateSort } from "@/lib/templates/queries";

export const metadata: Metadata = {
  title: "Template marketplace",
  description:
    "Browse production-ready website templates across SaaS, portfolio, restaurant, e-commerce and more. Preview each one live, then make it yours.",
  alternates: { canonical: "/templates" },
};

export const revalidate = 120;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function TemplatesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Number.parseInt(one(params.page) ?? "1", 10) || 1;

  const query = {
    search: one(params.q),
    category: one(params.category),
    tier: (one(params.tier) ?? "all") as "all" | "free" | "pro",
    colorScheme: one(params.scheme),
    sort: (one(params.sort) ?? "recommended") as TemplateSort,
    page,
    perPage: 24,
  };

  const [result, categories] = await Promise.all([listTemplates(query), listCategories()]);

  const buildHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (query.search) next.set("q", query.search);
    if (query.category) next.set("category", query.category);
    if (query.tier !== "all") next.set("tier", query.tier);
    if (query.colorScheme && query.colorScheme !== "all") next.set("scheme", query.colorScheme);
    if (query.sort !== "recommended") next.set("sort", query.sort);
    if (nextPage > 1) next.set("page", String(nextPage));
    const qs = next.toString();
    return qs ? `/templates?${qs}` : "/templates";
  };

  return (
    <div className="container-page py-12 sm:py-16">
      <header className="mb-10 max-w-[60ch]">
        <h1 className="text-balance-tight text-[clamp(2rem,4vw,3rem)] font-semibold">
          Template marketplace
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-white/50">
          Every template previews as the real website. Pick one, edit it in the browser, then
          download the files or deploy it live.
        </p>
      </header>

      {result.degraded && (
        <div className="mb-8 rounded-xl border border-[#ffd60a]/20 bg-[#ffd60a]/[0.06] px-4 py-3 text-[13px] text-[#ffd60a]">
          Showing the bundled catalogue — the database is not reachable, so favourites, usage counts
          and imported templates are unavailable.
        </div>
      )}

      <TemplateFilters categories={categories} total={result.total} />

      {result.items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center rounded-[20px] border border-dashed border-white/10 py-20 text-center">
          <LayoutGrid className="size-7 text-white/20" />
          <h2 className="mt-5 text-[17px] font-medium">No templates match those filters</h2>
          <p className="mt-2 max-w-[42ch] text-[14px] text-white/40">
            Try a different category, clear the search, or browse everything we have.
          </p>
          <Link href="/templates" className="mt-6">
            <Button variant="secondary">Show all templates</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.items.map((template, index) => (
              <TemplateCardItem
                key={template.slug}
                template={template}
                priority={index < 8}
                index={index}
              />
            ))}
          </div>

          {result.pageCount > 1 && (
            <nav
              className="mt-14 flex items-center justify-center gap-2"
              aria-label="Template pagination"
            >
              <Link href={buildHref(Math.max(1, result.page - 1))} aria-disabled={result.page === 1}>
                <Button variant="secondary" size="sm" disabled={result.page === 1}>
                  Previous
                </Button>
              </Link>
              <span className="px-3 text-[13px] text-white/40">
                Page {result.page} of {result.pageCount}
              </span>
              <Link
                href={buildHref(Math.min(result.pageCount, result.page + 1))}
                aria-disabled={result.page === result.pageCount}
              >
                <Button variant="secondary" size="sm" disabled={result.page === result.pageCount}>
                  Next
                </Button>
              </Link>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
