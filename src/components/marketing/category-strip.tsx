"use client";

import Link from "next/link";
import { ScrollRow } from "@/components/ui/scroll-row";
import type { CategorySummary } from "@/lib/templates/queries";

/** The landing page's category teaser — one scrolling line with arrow controls. */
export function CategoryStrip({ categories }: { categories: CategorySummary[] }) {
  return (
    <ScrollRow label="Categories">
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/templates?category=${category.slug}`}
          className="shrink-0 rounded-full border border-hairline px-3.5 py-1.5 text-[13px] text-ink-muted transition-all duration-300 hover:border-hairline-strong hover:text-white"
        >
          {category.name}
          <span className="ml-1.5 text-ink-dim">{category.count}</span>
        </Link>
      ))}
    </ScrollRow>
  );
}
