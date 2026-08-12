import Link from "next/link";
import {
  CloudUpload,
  Download,
  Eye,
  LayoutGrid,
  LayoutTemplate,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  getOverview,
  getRecentActivity,
  getRevenueByMonth,
  getSignupsByMonth,
  getTopTemplates,
} from "@/lib/admin/analytics";
import { BarChart } from "@/components/admin/charts";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, relativeTime } from "@/lib/utils";
import { isStripeConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [overview, revenue, signups, activity, topTemplates] = await Promise.all([
    getOverview(),
    getRevenueByMonth(12),
    getSignupsByMonth(12),
    getRecentActivity(12),
    getTopTemplates(6),
  ]);

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="text-[clamp(1.6rem,3vw,2.1rem)] font-semibold tracking-[-0.025em]">
          Platform overview
        </h1>
        <p className="mt-2 text-[14px] text-white/45">
          Live figures from the database. Revenue comes from verified Stripe webhooks only.
        </p>
      </header>

      {!isStripeConfigured() && (
        <div className="mb-6 rounded-xl border border-[#ffd60a]/20 bg-[#ffd60a]/[0.06] px-4 py-3 text-[13px] text-[#ffd60a]">
          Stripe is not configured, so revenue will stay at zero until keys are added and the
          webhook endpoint is registered.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={<Wallet className="size-4" />}
          label="MRR"
          value={formatCurrency(overview.revenue.mrr, overview.revenue.currency)}
          hint={`${overview.revenue.activeSubscriptions} active subscriptions`}
          accent
        />
        <Metric
          icon={<TrendingUp className="size-4" />}
          label="Revenue this month"
          value={formatCurrency(overview.revenue.grossThisMonth, overview.revenue.currency)}
          hint={`${formatCurrency(overview.revenue.netAllTime, overview.revenue.currency)} net all time`}
        />
        <Metric
          icon={<Users className="size-4" />}
          label="Users"
          value={overview.users.total.toLocaleString()}
          hint={`${overview.users.pro} Pro · ${overview.users.newThisMonth} new this month`}
        />
        <Metric
          icon={<LayoutGrid className="size-4" />}
          label="Projects"
          value={overview.projects.total.toLocaleString()}
          hint={`${overview.projects.published} published`}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={<LayoutTemplate className="size-4" />}
          label="Templates"
          value={overview.templates.total.toLocaleString()}
          hint={`${overview.templates.published} published · ${overview.templates.disabled} disabled`}
        />
        <Metric
          icon={<Download className="size-4" />}
          label="Downloads"
          value={overview.activity.downloads.toLocaleString()}
          hint="Website ZIPs generated"
        />
        <Metric
          icon={<CloudUpload className="size-4" />}
          label="Deployments"
          value={overview.activity.deployments.toLocaleString()}
          hint="Successful Cloudflare publishes"
        />
        <Metric
          icon={<Eye className="size-4" />}
          label="Free → Pro"
          value={`${overview.conversion.freeToProRate.toFixed(1)}%`}
          hint={`${overview.revenue.canceledThisMonth} cancelled this month`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card-surface rounded-[20px] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Revenue by month</h2>
            <Link href="/admin/revenue" className="text-[13px] text-white/40 hover:text-white">
              Full report →
            </Link>
          </div>
          <BarChart data={revenue.map((point) => ({ label: point.label, value: point.gross }))} />
        </section>

        <section className="card-surface rounded-[20px] p-6">
          <h2 className="mb-5 text-[15px] font-semibold">Sign-ups by month</h2>
          <BarChart
            data={signups.map((point) => ({ label: point.label, value: point.users }))}
            valueFormat="number"
            accent="#30d158"
          />
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="card-surface rounded-[20px] p-6">
          <h2 className="mb-4 text-[15px] font-semibold">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] text-white/30">Nothing has happened yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {activity.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] text-white/75">{entry.text}</p>
                    <p className="truncate text-[12px] text-white/30">{entry.meta}</p>
                  </div>
                  <span className="shrink-0 text-[12px] text-white/25">{relativeTime(entry.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-surface rounded-[20px] p-6">
          <h2 className="mb-4 text-[15px] font-semibold">Most used templates</h2>
          {topTemplates.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] text-white/30">No templates yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {topTemplates.map((template) => (
                <li key={template.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/templates/${template.slug}`}
                      className="truncate text-[13.5px] text-white/75 hover:text-white"
                    >
                      {template.name}
                    </Link>
                    <p className="text-[12px] text-white/30">
                      {template.category?.name ?? "Uncategorised"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{template.usageCount} used</Badge>
                    <Badge>{template.viewCount} views</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[16px] border p-4 ${
        accent
          ? "border-white/15 bg-gradient-to-b from-white/[0.07] to-transparent"
          : "card-surface"
      }`}
    >
      <div className="flex items-center gap-2 text-white/35">
        {icon}
        <span className="text-[12.5px]">{label}</span>
      </div>
      <p className="mt-3 text-[26px] font-semibold leading-none tracking-[-0.02em]">{value}</p>
      <p className="mt-1.5 truncate text-[12px] text-white/30">{hint}</p>
    </div>
  );
}
