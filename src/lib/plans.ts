import type { Plan } from "@prisma/client";

export type PlanLimits = {
  maxProjects: number; // Infinity for unlimited
  maxDownloads: number;
  canDeploy: boolean;
  canUsePremiumTemplates: boolean;
  maxAssetBytes: number;
  versionHistory: number;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxProjects: 1,
    maxDownloads: 1,
    canDeploy: false,
    canUsePremiumTemplates: false,
    maxAssetBytes: 5 * 1024 * 1024,
    versionHistory: 3,
  },
  PRO: {
    maxProjects: Number.POSITIVE_INFINITY,
    maxDownloads: Number.POSITIVE_INFINITY,
    canDeploy: true,
    canUsePremiumTemplates: true,
    maxAssetBytes: 25 * 1024 * 1024,
    versionHistory: 50,
  },
};

export const PRO_PRICE_USD = 20;

/**
 * Short, icon-led rows for the pricing cards. Deliberately separate from the
 * long `features` list, which the account page and upgrade dialog use — a
 * pricing card should be scannable in about four seconds.
 */
export const PLAN_HIGHLIGHTS = {
  FREE: [
    { icon: "layout", label: "One website project" },
    { icon: "sparkles", label: "Full visual editor" },
    { icon: "download", label: "One website download" },
    { icon: "history", label: "Short version history" },
  ],
  PRO: [
    { icon: "infinity", label: "Unlimited website projects" },
    { icon: "sparkles", label: "Full visual editor" },
    { icon: "download", label: "Unlimited downloads" },
    { icon: "globe", label: "One-click deployment" },
    { icon: "history", label: "Longer version history" },
  ],
} as const;

export const PLAN_COPY = {
  FREE: {
    name: "Free",
    heading: "Try Orion",
    subheading: "For a first site, start to finish",
    price: "$0",
    cadence: "forever",
    cta: "Start free",
    tagline: "Everything you need to build and ship one site.",
    features: [
      "1 website project",
      "Full template marketplace",
      "Complete visual editor",
      "Live responsive preview",
      "1 website download",
      "Community support",
    ],
    limits: ["No Cloudflare deployment", "One project at a time"],
  },
  PRO: {
    name: "Orion Pro",
    heading: "Everything unlocked",
    subheading: "Build as many sites as you like and put them online",
    price: `$${PRO_PRICE_USD}`,
    cadence: "per month",
    cta: "Upgrade to Pro",
    tagline: "Unlimited sites, one-click deployment, no ceilings.",
    features: [
      "Unlimited website projects",
      "Unlimited downloads",
      "One-click Cloudflare Pages deploys",
      "Custom deployment names",
      "Automatic redeploy after edits",
      "Deployment history and logs",
      "Premium template library",
      "Version history (50 versions)",
      "Priority support",
    ],
    limits: [],
  },
} as const;

export function limitsFor(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
}

export type QuotaCheck =
  | { allowed: true }
  | { allowed: false; reason: string; upgrade: true };

export function checkProjectQuota(plan: Plan, projectCount: number): QuotaCheck {
  const limits = limitsFor(plan);
  if (projectCount < limits.maxProjects) return { allowed: true };
  return {
    allowed: false,
    upgrade: true,
    reason: `The Free plan includes ${limits.maxProjects} website. Upgrade to Pro for unlimited projects.`,
  };
}

export function checkDownloadQuota(plan: Plan, downloadCount: number): QuotaCheck {
  const limits = limitsFor(plan);
  if (downloadCount < limits.maxDownloads) return { allowed: true };
  return {
    allowed: false,
    upgrade: true,
    reason: `You've used your ${limits.maxDownloads} free download. Upgrade to Pro for unlimited downloads.`,
  };
}

export function checkDeployQuota(plan: Plan): QuotaCheck {
  if (limitsFor(plan).canDeploy) return { allowed: true };
  return {
    allowed: false,
    upgrade: true,
    reason: "Deployment to Cloudflare Pages is a Pro feature.",
  };
}
