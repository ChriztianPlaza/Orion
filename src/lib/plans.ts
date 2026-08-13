import type { Plan } from "@prisma/client";

export type PlanLimits = {
  maxProjects: number; // Infinity for unlimited
  maxDownloads: number;
  /**
   * Length of the download allowance window in days, or null when the
   * allowance is counted over the lifetime of the account.
   */
  downloadPeriodDays: number | null;
  canUsePremiumTemplates: boolean;
  /** Largest single upload. */
  maxAssetBytes: number;
  /**
   * Ceiling on images held at once while editing. This is a working buffer,
   * not a storage allowance — uploads are released as soon as the project is
   * downloaded, so it is never advertised as a plan benefit.
   */
  maxStorageBytes: number;
  versionHistory: number;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxProjects: 5,
    maxDownloads: 5,
    downloadPeriodDays: 30, // five downloads a month, rolling
    canUsePremiumTemplates: false,
    maxAssetBytes: 5 * 1024 * 1024,
    maxStorageBytes: 50 * 1024 * 1024,
    versionHistory: 3,
  },
  PRO: {
    maxProjects: 50,
    maxDownloads: 50,
    downloadPeriodDays: 7, // 50 a week, rolling
    canUsePremiumTemplates: true,
    maxAssetBytes: 25 * 1024 * 1024,
    maxStorageBytes: 2 * 1024 * 1024 * 1024,
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
    { icon: "layout", label: "Five website projects" },
    { icon: "sparkles", label: "Full visual editor" },
    { icon: "download", label: "Five downloads a month" },
    { icon: "history", label: "Short version history" },
    { icon: "lock", label: "Free templates only" },
  ],
  PRO: [
    { icon: "layout", label: "50 website projects" },
    { icon: "sparkles", label: "Full visual editor" },
    { icon: "download", label: "50 downloads a week" },
    { icon: "crown", label: "Premium + animated templates" },
    { icon: "history", label: "Longer version history" },
  ],
} as const;

export const PLAN_COPY = {
  FREE: {
    name: "Free",
    /** One line under the plan name on the pricing card. */
    blurb: "Perfect for getting started",
    heading: "Try Orion",
    subheading: "Build up to five sites, start to finish",
    price: "$0",
    cadence: "forever",
    cta: "Start free",
    tagline: "Everything you need to design and export real websites.",
    features: [
      "5 website projects",
      "Free template library",
      "Complete visual editor",
      "Live responsive preview",
      "5 downloads per month",
      "Community support",
    ],
    limits: ["Five downloads a month", "No premium or animated templates"],
  },
  PRO: {
    name: "Pro",
    blurb: "Best for professionals",
    heading: "Everything unlocked",
    subheading: "Fifty projects, fifty downloads a week",
    price: `$${PRO_PRICE_USD}`,
    cadence: "per month",
    cta: "Upgrade to Pro",
    tagline: "Fifty sites and fifty downloads a week.",
    features: [
      "50 website projects",
      "50 downloads per week",
      "Premium and animated templates",
      "Version history (50 versions)",
      "Larger image uploads (25 MB)",
      "Priority support",
    ],
    limits: ["Download allowance resets weekly"],
  },
} as const;

/**
 * A third pricing card for anyone who outgrows Pro.
 *
 * Presentational only — there is no CUSTOM value in the `Plan` enum and nothing
 * in the app grants it. Enquiries are handled by hand, and whoever answers sets
 * the limits on the account directly.
 */
export const CONTACT_PLAN = {
  name: "Custom",
  blurb: "For teams and agencies",
  price: "Let's talk",
  cadence: "",
  cta: "Contact us",
  features: [
    "Everything in Pro",
    "Unlimited projects and downloads",
    "Higher upload and storage limits",
    "Volume and agency pricing",
    "Onboarding support",
  ],
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
    reason:
      plan === "PRO"
        ? `Pro includes ${limits.maxProjects} website projects. Delete one, or contact us about a custom plan.`
        : `The Free plan includes ${limits.maxProjects} websites. Upgrade to Pro for ${PLAN_LIMITS.PRO.maxProjects}.`,
  };
}

export function checkDownloadQuota(plan: Plan, downloadCount: number): QuotaCheck {
  const limits = limitsFor(plan);
  if (downloadCount < limits.maxDownloads) return { allowed: true };

  return {
    allowed: false,
    upgrade: true,
    reason: limits.downloadPeriodDays
      ? `You've used all ${limits.maxDownloads} downloads in your current ${
          limits.downloadPeriodDays
        }-day window. It resets automatically — contact us if you need more.`
      : `You've used your ${limits.maxDownloads} free download. Upgrade to Pro for ${PLAN_LIMITS.PRO.maxDownloads} a week.`,
  };
}

/**
 * Has the plan's download window elapsed since `periodStart`?
 *
 * A null `periodStart` on a windowed plan means the window has never been
 * opened — treated as expired so the first download starts one.
 */
export function downloadWindowExpired(plan: Plan, periodStart: Date | null): boolean {
  const days = limitsFor(plan).downloadPeriodDays;
  if (!days) return false;
  if (!periodStart) return true;
  return Date.now() - periodStart.getTime() >= days * 24 * 60 * 60 * 1000;
}
