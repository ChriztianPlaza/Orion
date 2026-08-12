import { prisma } from "@/lib/db";
import { ApiError, handleApiError, requireApiUser } from "@/lib/auth/guards";
import { consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { limitsFor } from "@/lib/plans";
import {
  safeUploadName,
  sniffImage,
  StorageNotConfiguredError,
  uploadObject,
} from "@/lib/storage/blob";

/**
 * Image uploads for the editor.
 *
 * The declared MIME type and file extension are both ignored: the first bytes
 * decide what the file actually is, and anything that is not a real image is
 * rejected before it reaches storage.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();

    const limit = await consumeRateLimit("upload.asset", user.id);
    if (!limit.ok) return rateLimitResponse(limit);

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const projectId = typeof form?.get("projectId") === "string" ? String(form.get("projectId")) : null;

    if (!(file instanceof File)) {
      throw new ApiError(400, "invalid_input", "No file was uploaded.");
    }

    const maxBytes = limitsFor(user.plan).maxAssetBytes;
    if (file.size > maxBytes) {
      throw new ApiError(
        413,
        "file_too_large",
        `Images must be under ${Math.round(maxBytes / 1024 / 1024)} MB on your plan.`,
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const sniffed = sniffImage(bytes);
    if (!sniffed) {
      throw new ApiError(
        415,
        "unsupported_type",
        "That file is not a supported image. Use PNG, JPEG, WebP, AVIF, GIF or SVG.",
      );
    }

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true },
      });
      if (!project || project.userId !== user.id) {
        throw new ApiError(403, "forbidden", "That project is not yours.");
      }
    }

    const name = safeUploadName(file.name, sniffed.ext);
    const blob = await uploadObject({
      pathname: `uploads/${user.id}/${name}`,
      bytes,
      contentType: sniffed.mime,
    });

    const asset = await prisma.projectAsset.create({
      data: {
        userId: user.id,
        projectId,
        url: blob.url,
        pathname: blob.pathname,
        name,
        size: bytes.byteLength,
        mimeType: sniffed.mime,
      },
      select: { id: true, url: true, name: true, size: true, mimeType: true, createdAt: true },
    });

    return Response.json({ asset }, { status: 201 });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return Response.json(
        {
          error: "storage_unconfigured",
          message:
            "Image uploads need object storage. Add BLOB_READ_WRITE_TOKEN, or paste an image URL instead.",
        },
        { status: 503 },
      );
    }
    return handleApiError(error);
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const projectId = new URL(request.url).searchParams.get("projectId");

    const assets = await prisma.projectAsset.findMany({
      where: { userId: user.id, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, url: true, name: true, size: true, mimeType: true, createdAt: true },
    });

    return Response.json({ assets });
  } catch (error) {
    return handleApiError(error);
  }
}
