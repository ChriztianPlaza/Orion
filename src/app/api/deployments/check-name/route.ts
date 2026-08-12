import { prisma } from "@/lib/db";
import { handleApiError, requireApiUser } from "@/lib/auth/guards";
import { consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { validateProjectName } from "@/lib/security/sanitize";
import { env, isCloudflareConfigured } from "@/lib/env";
import { CloudflareError, isProjectNameAvailable } from "@/lib/cloudflare/pages";

/**
 * Live availability check for the deploy dialog. Validates the shape first so
 * obviously bad input never reaches Cloudflare.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();

    // Every miss costs a Cloudflare API call, and unbounded it would let a
    // signed-in user enumerate which project names exist on the account.
    const limit = await consumeRateLimit("deploy.checkName", user.id);
    if (!limit.ok) return rateLimitResponse(limit);

    const raw = new URL(request.url).searchParams.get("name") ?? "";
    const validated = validateProjectName(raw);
    if (!validated.ok) {
      return Response.json({ available: false, valid: false, message: validated.error });
    }

    const name = validated.value;
    const host = `${name}.${env.CLOUDFLARE_PAGES_DOMAIN}`;

    const claimed = await prisma.project.findFirst({
      where: { subdomain: name },
      select: { id: true },
    });
    if (claimed) {
      return Response.json({
        available: false,
        valid: true,
        host,
        message: "That name is already taken.",
      });
    }

    if (!isCloudflareConfigured()) {
      return Response.json({
        available: true,
        valid: true,
        host,
        message: "Name looks good. Cloudflare is not configured on this instance yet.",
        unverified: true,
      });
    }

    try {
      const available = await isProjectNameAvailable(name);
      return Response.json({
        available,
        valid: true,
        host,
        message: available ? "Available" : "That name already exists on Cloudflare Pages.",
      });
    } catch (error) {
      if (error instanceof CloudflareError) {
        return Response.json({
          available: true,
          valid: true,
          host,
          unverified: true,
          message: "Could not verify with Cloudflare right now — you can still try deploying.",
        });
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
