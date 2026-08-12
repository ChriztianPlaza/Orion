/**
 * Seeds categories, tags and the bundled template library.
 *
 *   npm run db:seed
 *
 * Safe to re-run: everything upserts on a natural key, and user-created data is
 * never touched.
 */

import fs from "node:fs";
import path from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type Bundle = {
  meta: {
    name: string;
    slug: string;
    category: string;
    tags: string[];
    description: string;
    colorScheme?: "dark" | "light" | "colorful";
    tier?: "FREE" | "PRO";
    featured?: boolean;
    entryFile: string;
    pages: string[];
    thumbnail?: string;
    license: string;
    author?: string;
    source?: string;
    attribution?: string | null;
    responsive?: boolean;
  };
  files: Record<string, string>;
};

const CATEGORIES = [
  ["saas", "SaaS", "Software products sold by subscription", "cloud", "#2997ff"],
  ["startup", "Startup", "Launch pages for new companies", "rocket", "#bf5af2"],
  ["portfolio", "Portfolio", "Personal and studio showcases", "layout-grid", "#30d158"],
  ["agency", "Agency", "Studios and service businesses", "users", "#ff9f0a"],
  ["business", "Business", "Local and professional services", "briefcase", "#64d2ff"],
  ["restaurant", "Restaurant", "Menus, bookings and food businesses", "utensils", "#ff6961"],
  ["ecommerce", "E-commerce", "Storefronts and product pages", "shopping-bag", "#ffd60a"],
  ["blog", "Blog", "Writing, magazines and publications", "pen-line", "#a1a1a6"],
  ["personal", "Personal", "Résumés, links and personal sites", "user", "#5e5ce6"],
  ["photography", "Photography", "Image-first portfolios", "camera", "#d4af37"],
  ["developer", "Developer", "Docs, tools and open source", "terminal", "#00ff9d"],
  ["landing-page", "Landing Page", "Single-goal campaign pages", "target", "#ff453a"],
  ["real-estate", "Real Estate", "Listings and property agencies", "home", "#8e8e93"],
  ["education", "Education", "Schools, courses and academies", "graduation-cap", "#0071e3"],
  ["finance", "Finance", "Accounting, fintech and advisory", "line-chart", "#34d399"],
  ["healthcare", "Healthcare", "Clinics and practitioners", "heart-pulse", "#22d3ee"],
  ["events", "Events", "Conferences, weddings and gatherings", "calendar", "#e0578f"],
  ["creative", "Creative", "Art direction and creative studios", "palette", "#ff6a3d"],
  ["construction", "Construction", "Trades and building services", "hard-hat", "#c2703d"],
  ["travel", "Travel", "Tours, hotels and destinations", "plane", "#3b82f6"],
  ["fitness", "Fitness", "Gyms, studios and coaching", "dumbbell", "#f97316"],
  ["gaming", "Gaming", "Studios, teams and titles", "gamepad-2", "#ec4899"],
  ["technology", "Technology", "Infrastructure, security and AI", "cpu", "#7c5cff"],
] as const;

const TAG_KINDS: Record<string, string> = {
  dark: "color",
  light: "color",
  colorful: "color",
  minimal: "style",
  bold: "style",
  editorial: "style",
  serif: "style",
  terminal: "style",
  warm: "style",
  luxury: "style",
  playful: "style",
  typography: "style",
  gradient: "style",
  calm: "style",
  b2b: "industry",
  saas: "industry",
  local: "industry",
  services: "industry",
};

async function seedCategories() {
  for (const [slug, name, description, icon, accent] of CATEGORIES) {
    const order = CATEGORIES.findIndex((c) => c[0] === slug);
    await prisma.category.upsert({
      where: { slug },
      create: { slug, name, description, icon, accent, order },
      update: { name, description, icon, accent, order },
    });
  }
  console.log(`  categories: ${CATEGORIES.length}`);
}

async function seedTemplates() {
  const indexPath = path.resolve(process.cwd(), "src/generated/templates.json");
  if (!fs.existsSync(indexPath)) {
    console.warn("  no template index found — run `npm run templates:index` first");
    return;
  }

  const bundles = JSON.parse(fs.readFileSync(indexPath, "utf8")) as Record<string, Bundle>;
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  let count = 0;

  for (const [ref, bundle] of Object.entries(bundles)) {
    const meta = bundle.meta;
    const files = Object.entries(bundle.files);
    const totalBytes = files.reduce((sum, [, content]) => sum + Buffer.byteLength(content), 0);

    const data = {
      name: meta.name,
      description: meta.description,
      categoryId: categoryBySlug.get(meta.category) ?? null,
      thumbnail: meta.thumbnail ? `/api/preview/${meta.slug}/${meta.thumbnail}` : null,
      storage: "bundled",
      sourceRef: ref,
      entryFile: meta.entryFile,
      pages: meta.pages ?? [meta.entryFile],
      status: "PUBLISHED" as const,
      tier: (meta.tier ?? "FREE") as "FREE" | "PRO",
      featured: Boolean(meta.featured),
      license: meta.license ?? "MIT",
      author: meta.author ?? "Orion",
      source: meta.source ?? null,
      attribution: meta.attribution ?? null,
      colorScheme: meta.colorScheme ?? "dark",
      responsive: meta.responsive ?? true,
      fileCount: files.length,
      totalBytes,
    };

    const template = await prisma.template.upsert({
      where: { slug: meta.slug },
      create: { slug: meta.slug, ...data },
      update: data,
    });

    for (const name of meta.tags ?? []) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const tag = await prisma.tag.upsert({
        where: { slug },
        create: { slug, name, kind: TAG_KINDS[slug] ?? "tag" },
        update: {},
      });
      await prisma.templateTag.upsert({
        where: { templateId_tagId: { templateId: template.id, tagId: tag.id } },
        create: { templateId: template.id, tagId: tag.id },
        update: {},
      });
    }

    count += 1;
  }

  console.log(`  templates: ${count}`);
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("  admin: skipped (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one)");
    return;
  }
  if (password.length < 10) {
    console.warn("  admin: SEED_ADMIN_PASSWORD must be at least 10 characters — skipped");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: { email, name: "Administrator", role: "ADMIN", plan: "PRO", passwordHash },
    update: { role: "ADMIN", passwordHash },
  });
  console.log(`  admin: ${email}`);
}

async function main() {
  console.log("Seeding Orion…");
  await seedCategories();
  await seedTemplates();
  await seedAdmin();

  const [templates, cats] = await Promise.all([prisma.template.count(), prisma.category.count()]);
  console.log(`Done. ${templates} templates across ${cats} categories.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export type { Prisma };
