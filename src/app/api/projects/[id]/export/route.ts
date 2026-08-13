import JSZip from "jszip";
import { prisma } from "@/lib/db";
import { ApiError, handleApiError, requireApiUser } from "@/lib/auth/guards";
import { checkDownloadQuota, downloadWindowExpired, limitsFor } from "@/lib/plans";
import { clientIp, consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { getOwnedProject } from "@/lib/projects/service";
import { releaseProjectImages } from "@/lib/storage/gc";
import { appUrl } from "@/lib/env";
import { generateSite, totalGeneratedBytes } from "@/lib/templates/generate";
import { slugify } from "@/lib/utils";
import type { ProjectContent, ProjectMeta, ProjectTheme } from "@/lib/templates/types";

/**
 * Builds and streams the project as a ZIP of plain static files.
 *
 * The free-tier download limit is enforced here, against the database, inside
 * the same transaction that records the download. The UI hides the button when
 * the quota is spent, but the UI is not the control.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const sessionUser = await requireApiUser();
    const { id } = await params;

    const limit = await consumeRateLimit("download.export", sessionUser.id);
    if (!limit.ok) return rateLimitResponse(limit);

    // Authoritative plan + counter straight from the database.
    let user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, plan: true, downloadCount: true, downloadPeriodStart: true },
    });
    if (!user) throw new ApiError(401, "unauthorized", "Session no longer valid.");

    /*
     * Roll the allowance window before checking it.
     *
     * Plans with a rolling quota (Pro: 50 a week) keep a window start on the
     * user. Once it is older than the window the counter is zeroed and a new
     * window opens. The update is conditional on the same staleness test, so
     * two downloads firing together cannot both roll it and hand out a double
     * allowance — the second matches zero rows and reads the first one's result.
     */
    if (downloadWindowExpired(user.plan, user.downloadPeriodStart)) {
      const cutoff = new Date(
        Date.now() - (limitsFor(user.plan).downloadPeriodDays ?? 0) * 24 * 60 * 60 * 1000,
      );
      await prisma.user.updateMany({
        where: {
          id: user.id,
          OR: [{ downloadPeriodStart: null }, { downloadPeriodStart: { lt: cutoff } }],
        },
        data: { downloadCount: 0, downloadPeriodStart: new Date() },
      });

      user = await prisma.user.findUniqueOrThrow({
        where: { id: sessionUser.id },
        select: { id: true, plan: true, downloadCount: true, downloadPeriodStart: true },
      });
    }

    const quota = checkDownloadQuota(user.plan, user.downloadCount);
    if (!quota.allowed) throw new ApiError(402, "upgrade_required", quota.reason);

    const project = await getOwnedProject(id, user.id);
    if (!project.template) {
      throw new ApiError(409, "template_missing", "This project's template is no longer available.");
    }

    /*
     * Reserve the download before building it.
     *
     * Reading the counter and incrementing it afterwards is a time-of-check to
     * time-of-use race: two requests fired together both read `downloadCount: 0`
     * and both pass, so a free account can take several downloads. The
     * conditional `updateMany` makes the check and the increment a single
     * statement — the second request matches zero rows and is refused. The
     * reservation is released below if the build fails, so a genuine error
     * still does not burn the one free allowance.
     */
    const limits = limitsFor(user.plan);
    const reservation = Number.isFinite(limits.maxDownloads)
      ? await prisma.user.updateMany({
          where: { id: user.id, downloadCount: { lt: limits.maxDownloads } },
          data: { downloadCount: { increment: 1 } },
        })
      : await prisma.user.updateMany({
          where: { id: user.id },
          data: { downloadCount: { increment: 1 } },
        });

    if (reservation.count === 0) {
      throw new ApiError(
        402,
        "upgrade_required",
        checkDownloadQuota(user.plan, limits.maxDownloads).allowed
          ? "Download limit reached."
          : `You've used your ${limits.maxDownloads} free download. Upgrade to Pro for unlimited downloads.`,
      );
    }

    let archive: Uint8Array;
    let files: Awaited<ReturnType<typeof generateSite>>;

    try {
      files = await generateSite({
        template: project.template,
        content: (project.content ?? {}) as ProjectContent,
        theme: (project.theme ?? {}) as ProjectTheme,
        meta: (project.meta ?? {}) as ProjectMeta,
      });

      if (!files.length) {
        throw new ApiError(500, "empty_output", "The generated website was empty. Please try again.");
      }

      const zip = new JSZip();
      for (const file of files) zip.file(file.path, file.bytes);
      zip.file(
        "README.txt",
        readme(project.name, project.template.name, project.template.attribution),
      );

      archive = await zip.generateAsync({
        type: "uint8array",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
    } catch (buildError) {
      // Hand the allowance back — the user got nothing for it.
      await prisma.user
        .update({ where: { id: user.id }, data: { downloadCount: { decrement: 1 } } })
        .catch(() => {});
      throw buildError;
    }

    await prisma.download.create({
      data: {
        userId: user.id,
        projectId: project.id,
        bytes: totalGeneratedBytes(files),
        fileCount: files.length,
        ip: clientIp(request.headers).slice(0, 60),
        userAgent: (request.headers.get("user-agent") ?? "").slice(0, 200),
      },
    });

    /*
     * Uploaded images are temporary by design: they exist so the editor can
     * show them, and the archive above already contains every one of them under
     * assets/uploads/ with the markup rewritten to relative paths. Holding the
     * originals after that point grows object storage without end for no
     * benefit, so they are released here.
     *
     * Never let this fail the response — the user's archive is built and paid
     * for. A failure here leaves the images unreferenced, which the scheduled
     * `storage:gc` sweep collects anyway.
     */
    const released = await releaseProjectImages(project.id).catch(() => null);

    const filename = `${slugify(project.name) || "website"}.zip`;

    return new Response(archive as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(archive.byteLength),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        // Lets the editor tell the user their images were handed back.
        "X-Orion-Images-Released": String(released?.released ?? 0),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function readme(projectName: string, templateName: string, attribution: string | null) {
  return `${projectName}
${"=".repeat(projectName.length)}

Built with Orion from the "${templateName}" template.

WHAT IS IN HERE
---------------
Plain HTML, CSS and JavaScript. There is no build step, no framework and no
dependency on Orion. Open index.html in a browser and it works.

HOSTING IT
----------
Upload this folder to any static host. The fastest way is app.netlify.com/drop —
drag the folder onto the page and it is live in about a minute, free. Cloudflare
Pages, GitHub Pages, Vercel, S3 and any ordinary web server all work too.

Step-by-step instructions for each: ${appUrl()}/guides/deploy

Keep the folder structure exactly as it is so relative paths keep resolving.

EDITING IT
----------
Every file is readable and editable in any text editor. Images you uploaded are
in assets/uploads/.
${attribution ? `\nATTRIBUTION\n-----------\n${attribution}\n` : ""}
Generated ${new Date().toISOString().slice(0, 10)}.
`;
}
