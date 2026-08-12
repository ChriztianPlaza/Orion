import { prisma } from "@/lib/db";
import { bundledTemplates } from "@/generated/templates";
import type { Prisma, TemplateTier } from "@prisma/client";

/**
 * Read models for the marketplace.
 *
 * Every query degrades to the compiled bundle when the database is unreachable,
 * so a fresh clone renders a full marketplace before `DATABASE_URL` is set. The
 * fallback is read-only — anything that writes still requires a database.
 */

export type TemplateCard = {
  id: string;
  slug: string;
  name: string;
  description: string;
  thumbnail: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  tags: string[];
  tier: TemplateTier;
  featured: boolean;
  colorScheme: string;
  responsive: boolean;
  author: string | null;
  license: string;
  usageCount: number;
  viewCount: number;
  createdAt: Date;
};

export type TemplateSort = "popular" | "newest" | "recommended" | "az";

export type TemplateQuery = {
  search?: string;
  category?: string;
  tags?: string[];
  tier?: "all" | "free" | "pro";
  colorScheme?: string;
  sort?: TemplateSort;
  page?: number;
  perPage?: number;
};

export type TemplateListResult = {
  items: TemplateCard[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
  degraded: boolean;
};

const DEFAULT_PER_PAGE = 24;

export async function listTemplates(query: TemplateQuery = {}): Promise<TemplateListResult> {
  const page = Math.max(1, query.page ?? 1);
  const perPage = Math.min(60, Math.max(6, query.perPage ?? DEFAULT_PER_PAGE));
  const skip = (page - 1) * perPage;

  const where: Prisma.TemplateWhereInput = { status: "PUBLISHED" };

  if (query.search?.trim()) {
    const search = query.search.trim().slice(0, 80);
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { tags: { some: { tag: { name: { contains: search, mode: "insensitive" } } } } },
      { category: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (query.category && query.category !== "all") {
    where.category = { slug: query.category };
  }
  if (query.tags?.length) {
    where.tags = { some: { tag: { slug: { in: query.tags } } } };
  }
  if (query.tier === "free") where.tier = "FREE";
  if (query.tier === "pro") where.tier = "PRO";
  if (query.colorScheme && query.colorScheme !== "all") where.colorScheme = query.colorScheme;

  const orderBy = sortToOrderBy(query.sort ?? "recommended");

  try {
    const [rows, total] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy,
        skip,
        take: perPage,
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          thumbnail: true,
          tier: true,
          featured: true,
          colorScheme: true,
          responsive: true,
          author: true,
          license: true,
          usageCount: true,
          viewCount: true,
          createdAt: true,
          category: { select: { slug: true, name: true } },
          tags: { select: { tag: { select: { name: true } } } },
        },
      }),
      prisma.template.count({ where }),
    ]);

    return {
      items: rows.map(toCard),
      total,
      page,
      perPage,
      pageCount: Math.max(1, Math.ceil(total / perPage)),
      degraded: false,
    };
  } catch (error) {
    console.warn("[templates] database unavailable, serving bundled index", error);
    return bundledFallback(query, page, perPage);
  }
}

function sortToOrderBy(sort: TemplateSort): Prisma.TemplateOrderByWithRelationInput[] {
  switch (sort) {
    case "popular":
      return [{ usageCount: "desc" }, { viewCount: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    case "az":
      return [{ name: "asc" }];
    default:
      return [{ featured: "desc" }, { usageCount: "desc" }, { createdAt: "desc" }];
  }
}

type Row = {
  id: string;
  slug: string;
  name: string;
  description: string;
  thumbnail: string | null;
  tier: TemplateTier;
  featured: boolean;
  colorScheme: string;
  responsive: boolean;
  author: string | null;
  license: string;
  usageCount: number;
  viewCount: number;
  createdAt: Date;
  category: { slug: string; name: string } | null;
  tags: { tag: { name: string } }[];
};

function toCard(row: Row): TemplateCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    thumbnail: row.thumbnail,
    categorySlug: row.category?.slug ?? null,
    categoryName: row.category?.name ?? null,
    tags: row.tags.map((t) => t.tag.name),
    tier: row.tier,
    featured: row.featured,
    colorScheme: row.colorScheme,
    responsive: row.responsive,
    author: row.author,
    license: row.license,
    usageCount: row.usageCount,
    viewCount: row.viewCount,
    createdAt: row.createdAt,
  };
}

/* ---------------------------------------------------------------- fallback */

function bundledCards(): TemplateCard[] {
  return Object.entries(bundledTemplates).map(([ref, bundle], index) => ({
    id: `bundled:${ref}`,
    slug: bundle.meta.slug,
    name: bundle.meta.name,
    description: bundle.meta.description,
    thumbnail: bundle.meta.thumbnail
      ? `/api/preview/${bundle.meta.slug}/${bundle.meta.thumbnail}`
      : null,
    categorySlug: bundle.meta.category,
    categoryName: bundle.meta.category
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    tags: bundle.meta.tags ?? [],
    tier: (bundle.meta.tier ?? "FREE") as TemplateTier,
    featured: Boolean(bundle.meta.featured),
    colorScheme: bundle.meta.colorScheme ?? "dark",
    responsive: bundle.meta.responsive ?? true,
    author: bundle.meta.author ?? "Orion",
    license: bundle.meta.license ?? "MIT",
    usageCount: 0,
    viewCount: 0,
    createdAt: new Date(Date.now() - index * 60_000),
  }));
}

function bundledFallback(query: TemplateQuery, page: number, perPage: number): TemplateListResult {
  let items = bundledCards();

  if (query.search?.trim()) {
    const needle = query.search.trim().toLowerCase();
    items = items.filter((item) =>
      [item.name, item.description, item.categoryName ?? "", ...item.tags]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }
  if (query.category && query.category !== "all") {
    items = items.filter((item) => item.categorySlug === query.category);
  }
  if (query.tier === "free") items = items.filter((item) => item.tier === "FREE");
  if (query.tier === "pro") items = items.filter((item) => item.tier === "PRO");
  if (query.colorScheme && query.colorScheme !== "all") {
    items = items.filter((item) => item.colorScheme === query.colorScheme);
  }
  if (query.tags?.length) {
    const wanted = new Set(query.tags);
    items = items.filter((item) =>
      item.tags.some((tag) => wanted.has(tag.toLowerCase().replace(/[^a-z0-9]+/g, "-"))),
    );
  }

  switch (query.sort) {
    case "az":
      items.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "newest":
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
    default:
      items.sort((a, b) => Number(b.featured) - Number(a.featured));
  }

  const total = items.length;
  return {
    items: items.slice((page - 1) * perPage, page * perPage),
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
    degraded: true,
  };
}

/* ------------------------------------------------------------- categories */

export type CategorySummary = {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  accent: string | null;
  count: number;
};

export async function listCategories(): Promise<CategorySummary[]> {
  try {
    const rows = await prisma.category.findMany({
      orderBy: { order: "asc" },
      select: {
        slug: true,
        name: true,
        description: true,
        icon: true,
        accent: true,
        _count: { select: { templates: { where: { status: "PUBLISHED" } } } },
      },
    });
    if (rows.length) {
      return rows.map((row) => ({
        slug: row.slug,
        name: row.name,
        description: row.description,
        icon: row.icon,
        accent: row.accent,
        count: row._count.templates,
      }));
    }
  } catch (error) {
    console.warn("[templates] category query failed, using bundled index", error);
  }

  const counts = new Map<string, number>();
  for (const bundle of Object.values(bundledTemplates)) {
    counts.set(bundle.meta.category, (counts.get(bundle.meta.category) ?? 0) + 1);
  }
  return [...counts.entries()].map(([slug, count]) => ({
    slug,
    name: slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    description: null,
    icon: null,
    accent: null,
    count,
  }));
}

/* --------------------------------------------------------------- detail */

export type TemplateDetail = TemplateCard & {
  entryFile: string;
  pages: string[];
  source: string | null;
  attribution: string | null;
  fileCount: number;
  totalBytes: number;
};

export async function getTemplateBySlug(slug: string): Promise<TemplateDetail | null> {
  try {
    const row = await prisma.template.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        thumbnail: true,
        tier: true,
        featured: true,
        colorScheme: true,
        responsive: true,
        author: true,
        license: true,
        usageCount: true,
        viewCount: true,
        createdAt: true,
        entryFile: true,
        pages: true,
        source: true,
        attribution: true,
        fileCount: true,
        totalBytes: true,
        category: { select: { slug: true, name: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    });
    if (row) {
      return {
        ...toCard(row),
        entryFile: row.entryFile,
        pages: row.pages,
        source: row.source,
        attribution: row.attribution,
        fileCount: row.fileCount,
        totalBytes: row.totalBytes,
      };
    }
  } catch (error) {
    console.warn("[templates] detail query failed, using bundled index", error);
  }

  const entry = Object.entries(bundledTemplates).find(([, b]) => b.meta.slug === slug);
  if (!entry) return null;
  const [, bundle] = entry;
  const card = bundledCards().find((item) => item.slug === slug);
  if (!card) return null;

  return {
    ...card,
    entryFile: bundle.meta.entryFile,
    pages: bundle.meta.pages ?? [bundle.meta.entryFile],
    source: bundle.meta.source ?? null,
    attribution: bundle.meta.attribution ?? null,
    fileCount: Object.keys(bundle.files).length,
    totalBytes: Object.values(bundle.files).reduce((sum, content) => sum + content.length, 0),
  };
}

export async function listSimilarTemplates(
  categorySlug: string | null,
  excludeSlug: string,
  take = 3,
): Promise<TemplateCard[]> {
  const result = await listTemplates({
    category: categorySlug ?? undefined,
    perPage: take + 1,
    sort: "recommended",
  });
  return result.items.filter((item) => item.slug !== excludeSlug).slice(0, take);
}

export async function listFeaturedTemplates(take = 6): Promise<TemplateCard[]> {
  const result = await listTemplates({ sort: "recommended", perPage: take });
  return result.items;
}
