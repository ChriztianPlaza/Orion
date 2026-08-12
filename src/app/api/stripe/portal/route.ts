import { prisma } from "@/lib/db";
import { handleApiError, requireApiUser } from "@/lib/auth/guards";
import { consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { appUrl } from "@/lib/env";
import { ensureCustomer, stripe, StripeNotConfiguredError } from "@/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const sessionUser = await requireApiUser();

    const limit = await consumeRateLimit("billing.session", sessionUser.id);
    if (!limit.ok) return rateLimitResponse(limit);

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });
    if (!user) {
      return Response.json({ error: "unauthorized", message: "Session expired." }, { status: 401 });
    }

    const customerId = await ensureCustomer(user);

    const session = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl()}/account`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return Response.json(
        {
          error: "stripe_unconfigured",
          message: "Billing is not configured on this instance.",
        },
        { status: 503 },
      );
    }
    return handleApiError(error);
  }
}
