import { prisma } from "@/lib/db";
import { handleApiError, requireApiUser } from "@/lib/auth/guards";
import { consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { appUrl, env } from "@/lib/env";
import { ensureCustomer, stripe, StripeNotConfiguredError } from "@/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const sessionUser = await requireApiUser();

    // Each call creates a Stripe object; unbounded it is a way to run up API
    // usage against our account.
    const limit = await consumeRateLimit("billing.session", sessionUser.id);
    if (!limit.ok) return rateLimitResponse(limit);

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, email: true, name: true, plan: true, stripeCustomerId: true },
    });
    if (!user) {
      return Response.json({ error: "unauthorized", message: "Session expired." }, { status: 401 });
    }

    if (user.plan === "PRO") {
      return Response.json(
        { error: "already_pro", message: "You are already on the Pro plan." },
        { status: 409 },
      );
    }

    const customerId = await ensureCustomer(user);
    const base = appUrl();

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: env.STRIPE_PRICE_ID!, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      client_reference_id: user.id,
      subscription_data: { metadata: { userId: user.id } },
      metadata: { userId: user.id },
      success_url: `${base}/dashboard?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pricing?checkout=cancelled`,
    });

    if (!session.url) {
      return Response.json(
        { error: "checkout_failed", message: "Stripe did not return a checkout URL." },
        { status: 502 },
      );
    }

    return Response.json({ url: session.url });
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return Response.json(
        {
          error: "stripe_unconfigured",
          message:
            "Billing is not configured on this instance. An administrator needs to add STRIPE_SECRET_KEY and STRIPE_PRICE_ID.",
        },
        { status: 503 },
      );
    }
    return handleApiError(error);
  }
}
