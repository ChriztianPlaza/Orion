import { prisma } from "@/lib/db";
import { ApiError, handleApiError, requireApiAdmin } from "@/lib/auth/guards";
import { clientIp, consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { extractTemplateArchive, TemplateArchiveError } from "@/lib/templates/import-zip";
import { logAdminAction } from "@/lib/admin/analytics";
import { StorageNotConfiguredError, uploadObject } from "@/lib/storage/blob";
import { slugify } from "@/lib/utils";
import { stripTags } from "@/lib/security/sanitize";

/**
 * Admin template upload.
 *
 * Text assets are stored in Postgres (TemplateFile rows); binaries go to object
 * storage. Nothing extracted here is ever executed server-side — it is only
 * ever served back into a sandboxed iframe.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** 60s is the Hobby-plan ceiling; raise to 120+ on Pro for very large archives. */
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    await requireApiAdmin();

    const url = new URL(request.url);
    const search = url.searchParams.get("q")?.trim();
    const status = url.searchParams.get("status");
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const perPage = 40;

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { slug: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(status && status !== "all" ? { status: status as "PUBLISHED" | "DRAFT" | "DISABLED" } : {}),
    };

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
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
          category: { select: { name: true, slug: true } },
        },
      }),
      prisma.template.count({ where }),
    ]);

    return Response.json({ templates, total, page, perPage });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireApiAdmin();

    const limit = await consumeRateLimit("admin.template.upload", admin.id);
    if (!limit.ok) return rateLimitResponse(limit);

    const form = await request.formData().catch(() => null);
    if (!form) throw new ApiError(400, "invalid_input", "Expected a multipart form upload.");

    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "invalid_input", "Attach a ZIP archive of the template.");
    }

    const name = stripTags(String(form.get("name") ?? "")).trim().slice(0, 120);
    if (!name) throw new ApiError(400, "invalid_input", "A template name is required.");

    const license = String(form.get("license") ?? "MIT").trim().slice(0, 60);
    if (!license) {
      throw new ApiError(400, "invalid_input", "A license is required — templates cannot be published without one.");
    }

    const slugInput = String(form.get("slug") ?? "").trim();
    const slug = slugify(slugInput || name);
    const existing = await prisma.template.findUnique({ where: { slug }, select: { id: true } });
    if (existing) throw new ApiError(409, "slug_taken", "A template with that slug already exists.");

    const archive = new Uint8Array(await file.arrayBuffer());
    const extracted = await extractTemplateArchive(archive);

    const categorySlug = String(form.get("category") ?? "").trim();
    const category = categorySlug
      ? await prisma.category.findUnique({ where: { slug: categorySlug }, select: { id: true } })
      : null;

    const tagNames = String(form.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);

    const template = await prisma.template.create({
      data: {
        slug,
        name,
        description: stripTags(String(form.get("description") ?? "")).slice(0, 600),
        categoryId: category?.id ?? null,
        storage: "db",
        sourceRef: "",
        entryFile: extracted.entryFile,
        pages: extracted.pages,
        status: form.get("status") === "DRAFT" ? "DRAFT" : "PUBLISHED",
        tier: form.get("tier") === "PRO" ? "PRO" : "FREE",
        featured: form.get("featured") === "true",
        license,
        author: String(form.get("author") ?? "").trim().slice(0, 120) || null,
        source: String(form.get("source") ?? "").trim().slice(0, 400) || null,
        attribution: String(form.get("attribution") ?? "").trim().slice(0, 400) || null,
        colorScheme: ["dark", "light", "colorful"].includes(String(form.get("colorScheme")))
          ? String(form.get("colorScheme"))
          : "dark",
        fileCount: extracted.files.length,
        totalBytes: extracted.totalBytes,
      },
      select: { id: true, slug: true, name: true },
    });

    // Persist the files.
    let storageWarning: string | null = null;
    for (const extractedFile of extracted.files) {
      if (extractedFile.isText) {
        await prisma.templateFile.create({
          data: {
            templateId: template.id,
            path: extractedFile.path,
            mimeType: extractedFile.mimeType,
            size: extractedFile.bytes.byteLength,
            content: extractedFile.text ?? "",
          },
        });
        continue;
      }

      try {
        const blob = await uploadObject({
          pathname: `templates/${template.slug}/${extractedFile.path}`,
          bytes: extractedFile.bytes,
          contentType: extractedFile.mimeType,
        });
        await prisma.templateFile.create({
          data: {
            templateId: template.id,
            path: extractedFile.path,
            mimeType: extractedFile.mimeType,
            size: extractedFile.bytes.byteLength,
            url: blob.url,
          },
        });
      } catch (error) {
        if (error instanceof StorageNotConfiguredError) {
          storageWarning =
            "Binary assets were skipped because object storage is not configured. Add BLOB_READ_WRITE_TOKEN and re-upload.";
          continue;
        }
        throw error;
      }
    }

    for (const tagName of tagNames) {
      const tagSlug = slugify(tagName);
      if (!tagSlug) continue;
      const tag = await prisma.tag.upsert({
        where: { slug: tagSlug },
        create: { slug: tagSlug, name: tagName },
        update: {},
      });
      await prisma.templateTag.upsert({
        where: { templateId_tagId: { templateId: template.id, tagId: tag.id } },
        create: { templateId: template.id, tagId: tag.id },
        update: {},
      });
    }

    await logAdminAction({
      userId: admin.id,
      action: "template.create",
      target: template.slug,
      targetId: template.id,
      metadata: { files: extracted.files.length, license, skipped: extracted.skipped.length },
      ip: clientIp(request.headers),
    });

    return Response.json(
      {
        template,
        files: extracted.files.length,
        skipped: extracted.skipped,
        warning: storageWarning,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof TemplateArchiveError) {
      return Response.json({ error: "invalid_archive", message: error.message }, { status: 400 });
    }
    return handleApiError(error);
  }
}
