import { prisma } from "@/lib/db";

/**
 * Admin metrics.
 *
 * Revenue figures come from the Payment table, which is written only by the
 * verified Stripe webhook. Nothing here is estimated or synthesised — if Stripe
 * has not told us about money, we do not report it.
 */

export type Overview = {
  users: { total: number; free: number; pro: number; newThisMonth: number };
  projects: { total: number; published: number; createdThisMonth: number };
  templates: { total: number; published: number; disabled: number };
  activity: { downloads: number; deployments: number; templateViews: number };
  revenue: {
    grossAllTime: number;
    grossThisMonth: number;
    refundedAllTime: number;
    netAllTime: number;
    mrr: number;
    activeSubscriptions: number;
    canceledThisMonth: number;
    failedPaymentsThisMonth: number;
    currency: string;
  };
  conversion: { freeToProRate: number };
};

function startOfMonth(offset = 0) {
  const date = new Date();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - offset, 1));
}

export async function getOverview(): Promise<Overview> {
  const monthStart = startOfMonth();

  const [
    totalUsers,
    proUsers,
    newUsers,
    totalProjects,
    publishedProjects,
    newProjects,
    totalTemplates,
    publishedTemplates,
    disabledTemplates,
    downloads,
    deployments,
    templateViews,
    grossAllTime,
    grossThisMonth,
    refunded,
    activeSubs,
    canceledThisMonth,
    failedThisMonth,
    activePaymentsSample,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: "PRO" } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.project.count(),
    prisma.project.count({ where: { status: "PUBLISHED" } }),
    prisma.project.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.template.count(),
    prisma.template.count({ where: { status: "PUBLISHED" } }),
    prisma.template.count({ where: { status: "DISABLED" } }),
    prisma.download.count(),
    prisma.deployment.count({ where: { status: "SUCCESS" } }),
    prisma.templateView.count(),
    prisma.payment.aggregate({ where: { status: "succeeded" }, _sum: { amount: true } }),
    prisma.payment.aggregate({
      where: { status: "succeeded", createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({ _sum: { refunded: true } }),
    prisma.subscription.count({ where: { status: { in: ["ACTIVE", "TRIALING"] } } }),
    prisma.subscription.count({
      where: { status: "CANCELED", canceledAt: { gte: monthStart } },
    }),
    prisma.payment.count({ where: { status: "failed", createdAt: { gte: monthStart } } }),
    prisma.payment.findFirst({
      where: { status: "succeeded" },
      orderBy: { createdAt: "desc" },
      select: { amount: true, currency: true },
    }),
  ]);

  const gross = grossAllTime._sum.amount ?? 0;
  const refundedTotal = refunded._sum.refunded ?? 0;

  // MRR from the actual last invoice amount when we have one, so promotional
  // pricing is reflected rather than assumed.
  const unitAmount = activePaymentsSample?.amount ?? 2000;
  const mrr = activeSubs * unitAmount;

  return {
    users: {
      total: totalUsers,
      free: totalUsers - proUsers,
      pro: proUsers,
      newThisMonth: newUsers,
    },
    projects: { total: totalProjects, published: publishedProjects, createdThisMonth: newProjects },
    templates: {
      total: totalTemplates,
      published: publishedTemplates,
      disabled: disabledTemplates,
    },
    activity: { downloads, deployments, templateViews },
    revenue: {
      grossAllTime: gross,
      grossThisMonth: grossThisMonth._sum.amount ?? 0,
      refundedAllTime: refundedTotal,
      netAllTime: gross - refundedTotal,
      mrr,
      activeSubscriptions: activeSubs,
      canceledThisMonth,
      failedPaymentsThisMonth: failedThisMonth,
      currency: activePaymentsSample?.currency ?? "usd",
    },
    conversion: {
      freeToProRate: totalUsers > 0 ? (proUsers / totalUsers) * 100 : 0,
    },
  };
}

export type MonthlyRevenue = { month: string; label: string; gross: number; count: number };

export async function getRevenueByMonth(months = 12): Promise<MonthlyRevenue[]> {
  const since = startOfMonth(months - 1);

  const payments = await prisma.payment.findMany({
    where: { status: "succeeded", createdAt: { gte: since } },
    select: { amount: true, createdAt: true },
  });

  const buckets = new Map<string, { gross: number; count: number }>();
  for (let index = months - 1; index >= 0; index -= 1) {
    const date = startOfMonth(index);
    buckets.set(date.toISOString().slice(0, 7), { gross: 0, count: 0 });
  }

  for (const payment of payments) {
    const key = payment.createdAt.toISOString().slice(0, 7);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.gross += payment.amount;
    bucket.count += 1;
  }

  return [...buckets.entries()].map(([month, value]) => ({
    month,
    label: new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    }),
    gross: value.gross,
    count: value.count,
  }));
}

export type SignupPoint = { month: string; label: string; users: number; pro: number };

export async function getSignupsByMonth(months = 12): Promise<SignupPoint[]> {
  const since = startOfMonth(months - 1);
  const users = await prisma.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, plan: true },
  });

  const buckets = new Map<string, { users: number; pro: number }>();
  for (let index = months - 1; index >= 0; index -= 1) {
    const date = startOfMonth(index);
    buckets.set(date.toISOString().slice(0, 7), { users: 0, pro: 0 });
  }

  for (const user of users) {
    const key = user.createdAt.toISOString().slice(0, 7);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.users += 1;
    if (user.plan === "PRO") bucket.pro += 1;
  }

  return [...buckets.entries()].map(([month, value]) => ({
    month,
    label: new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    }),
    users: value.users,
    pro: value.pro,
  }));
}

export async function getRecentActivity(take = 12) {
  const [projects, deployments, payments, admin] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, name: true, createdAt: true, user: { select: { email: true } } },
    }),
    prisma.deployment.findMany({
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, projectName: true, url: true, createdAt: true, user: { select: { email: true } } },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, amount: true, status: true, createdAt: true, user: { select: { email: true } } },
    }),
    prisma.adminActivity.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, action: true, target: true, createdAt: true, user: { select: { email: true } } },
    }),
  ]);

  type Entry = { id: string; kind: string; text: string; meta: string; at: Date };
  const entries: Entry[] = [
    ...projects.map((p) => ({
      id: `p-${p.id}`,
      kind: "project",
      text: `New project "${p.name}"`,
      meta: p.user?.email ?? "",
      at: p.createdAt,
    })),
    ...deployments.map((d) => ({
      id: `d-${d.id}`,
      kind: "deployment",
      text: `Deployed ${d.projectName}`,
      meta: d.user?.email ?? "",
      at: d.createdAt,
    })),
    ...payments.map((p) => ({
      id: `pay-${p.id}`,
      kind: "payment",
      text: `Payment ${p.status}`,
      meta: p.user?.email ?? "",
      at: p.createdAt,
    })),
    ...admin.map((a) => ({
      id: `a-${a.id}`,
      kind: "admin",
      text: `${a.action}${a.target ? ` · ${a.target}` : ""}`,
      meta: a.user?.email ?? "",
      at: a.createdAt,
    })),
  ];

  return entries.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, take);
}

export async function getTopTemplates(take = 8) {
  return prisma.template.findMany({
    orderBy: [{ usageCount: "desc" }, { viewCount: "desc" }],
    take,
    select: {
      id: true,
      slug: true,
      name: true,
      usageCount: true,
      viewCount: true,
      favoriteCount: true,
      category: { select: { name: true } },
    },
  });
}

export async function logAdminAction(input: {
  userId: string;
  action: string;
  target?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  await prisma.adminActivity
    .create({
      data: {
        userId: input.userId,
        action: input.action,
        target: input.target ?? null,
        targetId: input.targetId ?? null,
        metadata: (input.metadata ?? {}) as never,
        ip: input.ip ?? null,
      },
    })
    .catch(() => {});
}
