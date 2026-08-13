import { prisma } from "@/lib/db";
import { getOverview, getRevenueByMonth } from "@/lib/admin/analytics";
import { BarChart } from "@/components/admin/charts";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { isStripeConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AdminRevenuePage() {
  const [overview, byMonth, payments, subscriptions] = await Promise.all([
    getOverview(),
    getRevenueByMonth(12),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        amount: true,
        refunded: true,
        currency: true,
        status: true,
        description: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    }),
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    }),
  ]);

  const currency = overview.revenue.currency;

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.025em]">
          Revenue
        </h1>
        <p className="mt-2 text-[13.5px] text-ink-muted">
          Every figure below is derived from Stripe webhook events. Nothing is estimated.
        </p>
      </header>

      {!isStripeConfigured() && (
        <div className="mb-6 rounded-xl border border-[#ffd60a]/20 bg-[#ffd60a]/[0.06] px-4 py-3 text-[13px] text-[#ffd60a]">
          Stripe keys are not configured on this instance, so no payment data can be recorded yet.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Figure label="MRR" value={formatCurrency(overview.revenue.mrr, currency)} accent />
        <Figure label="Gross all time" value={formatCurrency(overview.revenue.grossAllTime, currency)} />
        <Figure label="Refunded" value={formatCurrency(overview.revenue.refundedAllTime, currency)} />
        <Figure label="Net all time" value={formatCurrency(overview.revenue.netAllTime, currency)} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Figure label="Active subscriptions" value={String(overview.revenue.activeSubscriptions)} />
        <Figure label="Cancelled this month" value={String(overview.revenue.canceledThisMonth)} />
        <Figure label="Failed payments" value={String(overview.revenue.failedPaymentsThisMonth)} />
        <Figure label="Free → Pro" value={`${overview.conversion.freeToProRate.toFixed(1)}%`} />
      </div>

      <section className="card-surface mt-6 rounded-[14px] p-6">
        <h2 className="mb-5 text-[15px] font-semibold">Gross revenue, last 12 months</h2>
        <BarChart data={byMonth.map((point) => ({ label: point.label, value: point.gross }))} height={200} />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="card-surface overflow-x-auto rounded-[14px] p-6">
          <h2 className="mb-4 text-[15px] font-semibold">Recent payments</h2>
          {payments.length === 0 ? (
            <p className="py-8 text-center text-[13.5px] text-ink-dim">
              No payments recorded yet.
            </p>
          ) : (
            <table className="w-full min-w-[520px] text-[13px]">
              <thead>
                <tr className="border-b border-hairline text-left text-ink-muted">
                  <th scope="col" className="py-2 font-medium">Customer</th>
                  <th scope="col" className="py-2 font-medium">Description</th>
                  <th scope="col" className="py-2 text-right font-medium">Amount</th>
                  <th scope="col" className="py-2 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-white/[0.05] last:border-0">
                    <td className="max-w-[200px] truncate py-2.5 text-ink">
                      {payment.user?.email ?? "—"}
                    </td>
                    <td className="max-w-[220px] truncate py-2.5 text-ink-muted">
                      {payment.description ?? "Subscription"}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={payment.status === "failed" ? "text-[#ff6961]" : "text-white"}>
                        {formatCurrency(payment.amount, payment.currency)}
                      </span>
                      {payment.refunded > 0 && (
                        <span className="ml-1.5 text-[11px] text-ink-muted">
                          −{formatCurrency(payment.refunded, payment.currency)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-ink-muted">{formatDate(payment.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card-surface rounded-[14px] p-6">
          <h2 className="mb-4 text-[15px] font-semibold">Subscriptions</h2>
          {subscriptions.length === 0 ? (
            <p className="py-8 text-center text-[13.5px] text-ink-dim">No subscriptions yet.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {subscriptions.map((subscription) => (
                <li key={subscription.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-ink">
                      {subscription.user?.email ?? "Unknown"}
                    </p>
                    <p className="text-[11.5px] text-ink-dim">
                      {subscription.currentPeriodEnd
                        ? `${subscription.cancelAtPeriodEnd ? "Ends" : "Renews"} ${formatDate(subscription.currentPeriodEnd)}`
                        : formatDate(subscription.createdAt)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      subscription.status === "ACTIVE" || subscription.status === "TRIALING"
                        ? "success"
                        : subscription.status === "PAST_DUE" || subscription.status === "UNPAID"
                          ? "warning"
                          : "outline"
                    }
                  >
                    {subscription.status.toLowerCase().replace("_", " ")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Figure({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-[12px] border p-4 ${
        accent ? "border-hairline-strong bg-gradient-to-b from-white/[0.07] to-transparent" : "card-surface"
      }`}
    >
      <p className="text-[12.5px] text-ink-muted">{label}</p>
      <p className="mt-2.5 text-[26px] font-semibold leading-none tracking-[-0.02em]">{value}</p>
    </div>
  );
}
