import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { grantsPro, mapSubscriptionStatus, stripe, StripeNotConfiguredError } from "@/lib/stripe/client";

/**
 * Stripe webhook — the only writer of subscription state and revenue.
 *
 * Signature is verified before anything is read. Every event id is recorded so
 * a replay cannot double-count revenue. The frontend is never trusted to report
 * a successful payment.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HANDLED = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "charge.refunded",
]);

export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return Response.json(
      { error: "stripe_unconfigured", message: "Webhook secret is not configured." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return new Response("Stripe not configured", { status: 503 });
    }
    console.warn("[stripe] signature verification failed", error);
    return new Response("Invalid signature", { status: 400 });
  }

  if (!HANDLED.has(event.type)) return Response.json({ received: true, ignored: true });

  // Idempotency: a duplicate delivery is acknowledged but not reprocessed.
  try {
    await prisma.processedWebhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(event);
    return Response.json({ received: true });
  } catch (error) {
    console.error(`[stripe] handler failed for ${event.type}`, error);
    // Roll back the idempotency marker so Stripe's retry can succeed.
    await prisma.processedWebhookEvent.delete({ where: { id: event.id } }).catch(() => {});
    return new Response("Handler error", { status: 500 });
  }
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription) break;
      const subscription = await stripe().subscriptions.retrieve(String(session.subscription));
      await syncSubscription(subscription, session.client_reference_id ?? undefined);
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    }

    case "invoice.paid":
    case "invoice.payment_succeeded": {
      await recordInvoice(event, event.data.object as Stripe.Invoice, "succeeded");
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await recordInvoice(event, invoice, "failed");
      if (invoice.subscription) {
        const subscription = await stripe().subscriptions.retrieve(String(invoice.subscription));
        await syncSubscription(subscription);
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      await prisma.payment.updateMany({
        where: { stripeChargeId: charge.id },
        data: { refunded: charge.amount_refunded, status: charge.refunded ? "refunded" : "succeeded" },
      });
      break;
    }
  }
}

async function resolveUserId(
  customerId: string | null,
  fallbackUserId?: string,
  metadataUserId?: string,
): Promise<string | null> {
  if (metadataUserId) {
    const byMetadata = await prisma.user.findUnique({
      where: { id: metadataUserId },
      select: { id: true },
    });
    if (byMetadata) return byMetadata.id;
  }
  if (fallbackUserId) {
    const byReference = await prisma.user.findUnique({
      where: { id: fallbackUserId },
      select: { id: true },
    });
    if (byReference) return byReference.id;
  }
  if (customerId) {
    const byCustomer = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
    if (byCustomer) return byCustomer.id;

    // Last resort: the email on the Stripe customer.
    try {
      const customer = await stripe().customers.retrieve(customerId);
      if (!("deleted" in customer) && customer.email) {
        const byEmail = await prisma.user.findUnique({
          where: { email: customer.email.toLowerCase() },
          select: { id: true },
        });
        if (byEmail) {
          await prisma.user.update({
            where: { id: byEmail.id },
            data: { stripeCustomerId: customerId },
          });
          return byEmail.id;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

async function syncSubscription(subscription: Stripe.Subscription, clientReferenceId?: string) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const userId = await resolveUserId(
    customerId,
    clientReferenceId,
    subscription.metadata?.userId as string | undefined,
  );

  if (!userId) {
    console.warn("[stripe] no local user for subscription", subscription.id);
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id ?? "";
  const status = mapSubscriptionStatus(subscription.status);
  const isPro = grantsPro(subscription.status);

  const record = {
    userId,
    stripeCustomerId: customerId,
    stripePriceId: priceId,
    status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
  };

  await prisma.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where: { stripeSubscriptionId: subscription.id },
      create: { stripeSubscriptionId: subscription.id, ...record },
      update: record,
    });

    // Another active subscription (e.g. a second card) still grants Pro.
    const hasActive =
      isPro ||
      (await tx.subscription.count({
        where: { userId, status: { in: ["ACTIVE", "TRIALING"] } },
      })) > 0;

    await tx.user.update({
      where: { id: userId },
      data: {
        plan: hasActive ? "PRO" : "FREE",
        stripeCustomerId: customerId,
        // Upgrading clears the free-tier meters; downgrading resets them so the
        // user gets a clean free allowance rather than an inherited zero.
        ...(hasActive ? { downloadCount: 0 } : { downloadCount: 0 }),
      },
    });
  });
}

async function recordInvoice(event: Stripe.Event, invoice: Stripe.Invoice, status: string) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : (invoice.customer?.id ?? null);
  const userId = await resolveUserId(customerId, undefined, invoice.metadata?.userId as string | undefined);

  const amount = status === "succeeded" ? (invoice.amount_paid ?? 0) : (invoice.amount_due ?? 0);
  const line = invoice.lines?.data?.[0];

  await prisma.payment.create({
    data: {
      stripeEventId: event.id,
      stripeInvoiceId: invoice.id ?? null,
      stripeChargeId: typeof invoice.charge === "string" ? invoice.charge : (invoice.charge?.id ?? null),
      stripeCustomerId: customerId,
      userId,
      amount,
      currency: invoice.currency ?? "usd",
      status,
      description: invoice.description ?? line?.description ?? "Subscription",
      periodStart: line?.period?.start ? new Date(line.period.start * 1000) : null,
      periodEnd: line?.period?.end ? new Date(line.period.end * 1000) : null,
    },
  });
}
