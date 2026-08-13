import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";
import { listCategories, listTemplates } from "@/lib/templates/queries";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl().replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/templates`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/guides/deploy`, changeFrequency: "monthly", priority: 0.7 },
  ];

  try {
    const [categories, templates] = await Promise.all([
      listCategories(),
      listTemplates({ perPage: 60, sort: "recommended" }),
    ]);

    return [
      ...staticRoutes,
      ...categories.map((category) => ({
        url: `${base}/templates?category=${category.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...templates.items.map((template) => ({
        url: `${base}/templates/${template.slug}`,
        lastModified: template.createdAt,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
