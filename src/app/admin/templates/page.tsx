import { prisma } from "@/lib/db";
import { TemplateManager, type AdminTemplateRow } from "@/components/admin/template-manager";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function AdminTemplatesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(one(params.page) ?? "1", 10) || 1);
  const search = one(params.q)?.trim() ?? "";
  const status = one(params.status) ?? "all";
  const tier = one(params.tier) ?? "all";
  const category = one(params.category) ?? "all";

  const where: Prisma.TemplateWhereInput = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(status !== "all" ? { status: status as "PUBLISHED" | "DRAFT" | "DISABLED" } : {}),
    ...(tier !== "all" ? { tier: tier as "FREE" | "PRO" } : {}),
    ...(category !== "all" ? { category: { slug: category } } : {}),
  };

  const [templates, total, matching, categories, freeCount, proCount] = await Promise.all([
    prisma.template.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        tier: true,
        featured: true,
        storage: true,
        usageCount: true,
        viewCount: true,
        fileCount: true,
        license: true,
        author: true,
        updatedAt: true,
        category: { select: { name: true } },
      },
    }),
    prisma.template.count(),
    prisma.template.count({ where }),
    prisma.category.findMany({ orderBy: { order: "asc" }, select: { slug: true, name: true } }),
    prisma.template.count({ where: { tier: "FREE" } }),
    prisma.template.count({ where: { tier: "PRO" } }),
  ]);

  const rows: AdminTemplateRow[] = templates.map((template) => ({
    id: template.id,
    slug: template.slug,
    name: template.name,
    status: template.status,
    tier: template.tier,
    featured: template.featured,
    storage: template.storage,
    usageCount: template.usageCount,
    viewCount: template.viewCount,
    fileCount: template.fileCount,
    license: template.license,
    author: template.author,
    updatedAt: template.updatedAt.toISOString(),
    categoryName: template.category?.name ?? null,
  }));

  return (
    <div className="container-page py-10">
      <TemplateManager
        templates={rows}
        categories={categories}
        total={total}
        matching={matching}
        page={page}
        perPage={PER_PAGE}
        counts={{ free: freeCount, pro: proCount }}
        filters={{ search, status, tier, category }}
      />
    </div>
  );
}
