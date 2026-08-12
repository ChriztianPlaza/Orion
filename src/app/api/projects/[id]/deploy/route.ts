import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handleApiError, requireApiUser } from "@/lib/auth/guards";
import { checkDeployQuota } from "@/lib/plans";
import { consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { validateProjectName } from "@/lib/security/sanitize";
import { getOwnedProject } from "@/lib/projects/service";
import { generateSite } from "@/lib/templates/generate";
import {
  CloudflareError,
  CloudflareNotConfiguredError,
  deployToPages,
  isProjectNameAvailable,
} from "@/lib/cloudflare/pages";
import { slugify } from "@/lib/utils";
import type { ProjectContent, ProjectMeta, ProjectTheme } from "@/lib/templates/types";
import type { Prisma } from "@prisma/client";

/**
 * Deploys a project to Cloudflare Pages.
 *
 * Pro only, rate limited, and every step is written to the Deployment row so
 * the UI can show real progress rather than a fake spinner.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * 60s is the ceiling on Vercel's Hobby plan; asking for more there fails the
 * deployment outright. A typical site is a handful of files and finishes in a
 * few seconds. On Pro or Enterprise this can safely be raised to 300.
 */
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  projectName: z.string().trim().min(3).max(58).optional(),
});

export async function POST(request: Request, { params }: Params) {
  let deploymentId: string | null = null;

  try {
    const user = await requireApiUser();
    const { id } = await params;

    const limit = await consumeRateLimit("deploy.create", user.id);
    if (!limit.ok) return rateLimitResponse(limit);

    const quota = checkDeployQuota(user.plan);
    if (!quota.allowed) throw new ApiError(402, "upgrade_required", quota.reason);

    const project = await getOwnedProject(id, user.id);
    if (!project.template) {
      throw new ApiError(409, "template_missing", "This project's template is no longer available.");
    }

    const body = schema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) throw new ApiError(400, "invalid_input", "Check the deployment name.");

    // Reuse the previously claimed subdomain when redeploying.
    const requested =
      body.data.projectName ?? project.subdomain ?? suggestName(project.name, project.id);
    const validated = validateProjectName(requested);
    if (!validated.ok) throw new ApiError(400, "invalid_name", validated.error);
    const projectName = validated.value;

    // Somebody else's project cannot be overwritten, and a name already taken
    // inside this account by another project is refused too.
    const clash = await prisma.project.findFirst({
      where: { subdomain: projectName, NOT: { id: project.id } },
      select: { id: true },
    });
    if (clash) {
      throw new ApiError(409, "name_taken", "That deployment name is already in use. Pick another.");
    }

    if (project.subdomain !== projectName) {
      const available = await isProjectNameAvailable(projectName);
      if (!available) {
        throw new ApiError(
          409,
          "name_taken",
          "That name already exists on Cloudflare Pages. Try a different one.",
        );
      }
    }

    const deployment = await prisma.deployment.create({
      data: {
        projectId: project.id,
        userId: user.id,
        projectName,
        status: "PREPARING",
        steps: [step("preparing", "running")] as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    deploymentId = deployment.id;

    const files = await generateSite({
      template: project.template,
      content: (project.content ?? {}) as ProjectContent,
      theme: (project.theme ?? {}) as ProjectTheme,
      meta: (project.meta ?? {}) as ProjectMeta,
    });

    const steps: ReturnType<typeof step>[] = [step("preparing", "done")];

    const result = await deployToPages({
      projectName,
      files,
      onProgress: async (name, detail) => {
        steps.push(step(name, "running", detail));
        await prisma.deployment
          .update({
            where: { id: deployment.id },
            data: {
              status: name === "uploading" ? "UPLOADING" : name === "deploying" ? "BUILDING" : "PREPARING",
              steps: steps as Prisma.InputJsonValue,
            },
          })
          .catch(() => {});
      },
    });

    steps.push(step("live", "done"));

    const [updated] = await prisma.$transaction([
      prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: "SUCCESS",
          url: result.url,
          aliasUrl: result.aliasUrl,
          externalId: result.id,
          fileCount: result.fileCount,
          bytes: result.bytes,
          steps: steps as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
        select: {
          id: true,
          url: true,
          aliasUrl: true,
          projectName: true,
          status: true,
          fileCount: true,
          bytes: true,
          createdAt: true,
        },
      }),
      prisma.project.update({
        where: { id: project.id },
        data: { subdomain: projectName, status: "PUBLISHED" },
      }),
    ]);

    return Response.json({ deployment: updated }, { status: 201 });
  } catch (error) {
    if (deploymentId) {
      await prisma.deployment
        .update({
          where: { id: deploymentId },
          data: {
            status: "FAILED",
            error: errorMessage(error).slice(0, 2000),
            completedAt: new Date(),
          },
        })
        .catch(() => {});
    }

    if (error instanceof CloudflareNotConfiguredError) {
      return Response.json(
        {
          error: "cloudflare_unconfigured",
          message:
            "Deployment is not configured on this instance. An administrator needs to add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.",
        },
        { status: 503 },
      );
    }
    if (error instanceof CloudflareError) {
      return Response.json(
        { error: "cloudflare_error", message: `Cloudflare rejected the deployment: ${error.message}` },
        { status: 502 },
      );
    }
    return handleApiError(error);
  }
}

function step(name: string, status: "running" | "done" | "failed", detail?: string) {
  return { step: name, status, at: new Date().toISOString(), detail: detail ?? null };
}

function suggestName(projectName: string, projectId: string) {
  const base = slugify(projectName) || "site";
  return `${base}-${projectId.slice(-6).toLowerCase()}`.slice(0, 58);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown deployment error";
}
