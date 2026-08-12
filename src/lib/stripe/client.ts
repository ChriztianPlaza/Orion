import Stripe from "stripe";
import { env, isStripeConfigured } from "@/lib/env";
import { prisma } from "@/lib/db";

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("Stripe is not configured.");
    this.name = "StripeNotConfiguredError";
  }
}

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (!isStripeConfigured() || !env.STRIPE_SECRET_KEY) throw new StripeNotConfiguredError();
  cached ??= new Stripe(env.STRIPE_SECRET_KEY, {
    // Pinned to the version the installed SDK types are generated against.
    apiVersion: "2025-02-24.acacia",
    appInfo: { name: "Orion", version: "1.0.0" },
    typescript: true,
  });
  return cached;
}

/** Finds or creates the Stripe customer for a user, storing the id locally. */
export async function ensureCustomer(user: {
  id: string;
  email: string;
  name: string | null;
  stripeCustomerId: string | null;
}): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe().customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

const STATUS_MAP: Record<Stripe.Subscription.Status, string> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  incomplete: "INCOMPLETE",
  incomplete_expired: "INCOMPLETE_EXPIRED",
  unpaid: "UNPAID",
  paused: "PAUSED",
};

export function mapSubscriptionStatus(status: Stripe.Subscription.Status) {
  return (STATUS_MAP[status] ?? "INCOMPLETE") as
    | "ACTIVE"
    | "TRIALING"
    | "PAST_DUE"
    | "CANCELED"
    | "INCOMPLETE"
    | "INCOMPLETE_EXPIRED"
    | "UNPAID"
    | "PAUSED";
}

/** Only these statuses grant Pro access. */
export function grantsPro(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing";
}
