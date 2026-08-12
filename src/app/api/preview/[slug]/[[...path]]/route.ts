import { prisma } from "@/lib/db";
import { serveTemplateAsset } from "@/lib/templates/serve";
import { bundledTemplateSource } from "@/lib/templates/store";

/**
 * Public, sandboxed rendering of a published template.
 *   /api/preview/<slug>              -> entry file
 *   /api/preview/<slug>/style.css    -> asset
 *
 * Falls back to the compiled bundle when the database is unreachable, so
 * previews behave the same way the marketplace listing does.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; path?: string[] }> };

export async function GET(request: Request, { params }: Params) {
  const { slug, path } = await params;
  const thumbnail = new URL(request.url).searchParams.get("thumb") === "1";

  const template =
    (await prisma.template
      .findFirst({
        where: { slug, status: "PUBLISHED" },
        select: {
          id: true,
          slug: true,
          storage: true,
          sourceRef: true,
          entryFile: true,
          attribution: true,
        },
      })
      .catch(() => null)) ?? bundledTemplateSource(slug);

  if (!template) {
    return new Response("Template not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return serveTemplateAsset(template, path?.join("/"), {
    mode: "preview",
    baseHref: `/api/preview/${encodeURIComponent(slug)}/`,
    thumbnail,
    // Thumbnails are identical for everyone and change only when a template
    // does, so they can sit on the CDN for a day.
    cacheSeconds: thumbnail ? 86_400 : 3600,
  });
}
