import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/auth/guards";
import { checkProjectQuota, limitsFor } from "@/lib/plans";
import { slugify } from "@/lib/utils";
import { analyzeHtml } from "@/lib/templates/analyze";
import { loadTemplateFiles } from "@/lib/templates/store";
import {
  sanitizeInlineHtml,
  sanitizeStyleMap,
  sanitizeUrl,
  stripTags,
} from "@/lib/security/sanitize";
import type { EditableElement, ProjectContent, ProjectMeta, ProjectTheme } from "@/lib/templates/types";
import type { Plan, Prisma } from "@prisma/client";

/**
 * Project business logic. Route handlers stay thin: parse, authorise, call
 * these, serialise.
 */

export async function createProjectFromTemplate(input: {
  userId: string;
  plan: Plan;
  templateSlug?: string;
  templateId?: string;
  name?: string;
}) {
  const template = await prisma.template.findFirst({
    where: {
      status: "PUBLISHED",
      ...(input.templateId ? { id: input.templateId } : { slug: input.templateSlug ?? "" }),
    },
    select: { id: true, name: true, slug: true, tier: true },
  });
  if (!template) throw new ApiError(404, "template_not_found", "That template is not available.");

  if (template.tier === "PRO" && !limitsFor(input.plan).canUsePremiumTemplates) {
    throw new ApiError(
      402,
      "upgrade_required",
      "This is a Pro template. Upgrade to use premium designs.",
    );
  }

  const quotaSlot = await reserveProjectSlot(input.userId, input.plan);
  if (!quotaSlot.ok) throw new ApiError(402, "upgrade_required", quotaSlot.reason);

  const name = (input.name ?? template.name).slice(0, 80);
  const slug = await uniqueProjectSlug(input.userId, name);

  try {
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          userId: input.userId,
          templateId: template.id,
          name,
          slug,
          content: {},
          theme: {},
          meta: { title: name },
          lastEditedAt: new Date(),
        },
        select: { id: true, name: true, slug: true, createdAt: true },
      });

      await tx.template.update({
        where: { id: template.id },
        data: { usageCount: { increment: 1 } },
      });

      return created;
    });

    return { project, template };
  } catch (error) {
    await releaseProjectSlot(input.userId);
    throw error;
  }
}

/**
 * Claims one project slot atomically.
 *
 * Counting projects and then creating one is a time-of-check to time-of-use
 * race — two requests sent together both see zero projects and both succeed,
 * so a free account ends up with several. The conditional `updateMany` below
 * collapses the check and the increment into one statement: whichever request
 * loses matches no rows and is refused.
 *
 * `User.projectCount` is the counter of record for the gate, so it is first
 * reconciled against the real row count in case a crash left it adrift.
 */
async function reserveProjectSlot(
  userId: string,
  plan: Plan,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const limit = limitsFor(plan).maxProjects;

  if (!Number.isFinite(limit)) {
    await prisma.user.update({
      where: { id: userId },
      data: { projectCount: { increment: 1 } },
    });
    return { ok: true };
  }

  const [actual, user] = await Promise.all([
    prisma.project.count({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { projectCount: true } }),
  ]);
  if (user && user.projectCount !== actual) {
    await prisma.user.update({ where: { id: userId }, data: { projectCount: actual } });
  }

  const reserved = await prisma.user.updateMany({
    where: { id: userId, projectCount: { lt: limit } },
    data: { projectCount: { increment: 1 } },
  });

  if (reserved.count === 0) {
    const denied = checkProjectQuota(plan, limit);
    return { ok: false, reason: denied.allowed ? "Project limit reached." : denied.reason };
  }
  return { ok: true };
}

async function releaseProjectSlot(userId: string) {
  await prisma.user
    .update({ where: { id: userId }, data: { projectCount: { decrement: 1 } } })
    .catch(() => {});
}

async function uniqueProjectSlug(userId: string, name: string) {
  const base = slugify(name) || "website";
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await prisma.project.findFirst({
      where: { userId, slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function getOwnedProject(projectId: string, userId: string, isAdmin = false) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      template: {
        select: {
          id: true,
          slug: true,
          name: true,
          storage: true,
          sourceRef: true,
          entryFile: true,
          pages: true,
          attribution: true,
          tier: true,
        },
      },
    },
  });
  if (!project) throw new ApiError(404, "not_found", "Project not found.");
  if (project.userId !== userId && !isAdmin) {
    throw new ApiError(403, "forbidden", "You do not have access to this project.");
  }
  return project;
}

/**
 * The editable schema the editor renders its sidebar from — computed from the
 * template's HTML, cached in memory for the life of the lambda.
 */
const schemaCache = new Map<string, { at: number; pages: { file: string; elements: EditableElement[] }[] }>();
const SCHEMA_TTL = 5 * 60_000;

export async function getTemplateSchema(template: {
  id: string;
  slug: string;
  storage: string;
  sourceRef: string;
  entryFile: string;
}) {
  const cached = schemaCache.get(template.id);
  if (cached && Date.now() - cached.at < SCHEMA_TTL) return cached.pages;

  const files = await loadTemplateFiles(template);
  const pages = files
    .filter((file) => /\.html?$/i.test(file.path) && typeof file.content === "string")
    .sort((a, b) =>
      a.path === template.entryFile ? -1 : b.path === template.entryFile ? 1 : a.path.localeCompare(b.path),
    )
    .map((file) => ({
      file: file.path,
      elements: analyzeHtml(file.content ?? "", file.path).elements,
    }));

  schemaCache.set(template.id, { at: Date.now(), pages });
  return pages;
}

/* -------------------------------------------------------------- mutations */

const MAX_TEXT = 20_000;
const MAX_KEYS_PER_FILE = 3_000;

/** Validates and sanitises an incoming content map before it is persisted. */
export function sanitizeContent(input: unknown): ProjectContent {
  if (!input || typeof input !== "object") return {};
  const output: ProjectContent = {};

  for (const [file, rawValues] of Object.entries(input as Record<string, unknown>)) {
    if (!/^[\w./-]{1,200}$/.test(file) || file.includes("..")) continue;
    if (!rawValues || typeof rawValues !== "object") continue;

    const values: ProjectContent[string] = {};
    let count = 0;

    for (const [key, rawValue] of Object.entries(rawValues as Record<string, unknown>)) {
      if (count >= MAX_KEYS_PER_FILE) break;
      if (!/^[\w.:-]{1,120}$/.test(key)) continue;
      if (!rawValue || typeof rawValue !== "object") continue;

      const value = rawValue as Record<string, unknown>;
      const clean: ProjectContent[string][string] = {};

      if (typeof value.text === "string") clean.text = stripTags(value.text).slice(0, MAX_TEXT);
      if (typeof value.html === "string") clean.html = sanitizeInlineHtml(value.html).slice(0, MAX_TEXT);
      if (typeof value.src === "string") clean.src = sanitizeUrl(value.src, { allowDataImage: false }).slice(0, 2000);
      if (typeof value.alt === "string") clean.alt = stripTags(value.alt).slice(0, 300);
      if (typeof value.href === "string") clean.href = sanitizeUrl(value.href).slice(0, 2000);
      if (value.target === "_blank" || value.target === "_self") clean.target = value.target;
      if (typeof value.hidden === "boolean") clean.hidden = value.hidden;
      if (value.style && typeof value.style === "object") {
        const style = sanitizeStyleMap(value.style as Record<string, unknown>);
        if (Object.keys(style).length) clean.style = style;
      }

      if (Object.keys(clean).length) {
        values[key] = clean;
        count += 1;
      }
    }

    if (Object.keys(values).length) output[file] = values;
  }

  return output;
}

export function sanitizeTheme(input: unknown): ProjectTheme {
  if (!input || typeof input !== "object") return {};
  const value = input as Record<string, unknown>;
  const theme: ProjectTheme = {};

  if (value.vars && typeof value.vars === "object") {
    const vars: Record<string, string> = {};
    for (const [name, raw] of Object.entries(value.vars as Record<string, unknown>)) {
      if (!/^--[a-z0-9-]{1,60}$/i.test(name) || typeof raw !== "string") continue;
      vars[name.toLowerCase()] = raw.slice(0, 120);
    }
    if (Object.keys(vars).length) theme.vars = vars;
  }
  if (typeof value.fontFamily === "string") theme.fontFamily = value.fontFamily.slice(0, 200);
  if (typeof value.headingFont === "string") theme.headingFont = value.headingFont.slice(0, 200);
  if (typeof value.radius === "string") theme.radius = value.radius.slice(0, 40);
  if (typeof value.customCss === "string") theme.customCss = value.customCss.slice(0, 20_000);

  return theme;
}

export function sanitizeMeta(input: unknown): ProjectMeta {
  if (!input || typeof input !== "object") return {};
  const value = input as Record<string, unknown>;
  const meta: ProjectMeta = {};

  if (typeof value.title === "string") meta.title = stripTags(value.title).slice(0, 120);
  if (typeof value.description === "string") meta.description = stripTags(value.description).slice(0, 320);
  if (typeof value.favicon === "string") meta.favicon = sanitizeUrl(value.favicon).slice(0, 2000);
  if (typeof value.ogImage === "string") meta.ogImage = sanitizeUrl(value.ogImage).slice(0, 2000);
  if (typeof value.lang === "string" && /^[a-z]{2}(-[A-Z]{2})?$/.test(value.lang)) meta.lang = value.lang;

  return meta;
}

export async function saveProject(input: {
  projectId: string;
  userId: string;
  name?: string;
  content?: unknown;
  theme?: unknown;
  meta?: unknown;
  /** Revision the client based its edit on; guards against stale overwrites. */
  baseRevision?: number;
  plan: Plan;
}) {
  const existing = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, userId: true, revision: true, content: true, theme: true, meta: true },
  });
  if (!existing) throw new ApiError(404, "not_found", "Project not found.");
  if (existing.userId !== input.userId) throw new ApiError(403, "forbidden", "Not your project.");

  if (
    typeof input.baseRevision === "number" &&
    input.baseRevision < existing.revision - 1 // tolerate one in-flight save
  ) {
    throw new ApiError(
      409,
      "stale_revision",
      "This project was changed in another tab. Reload to continue editing.",
    );
  }

  const data: Prisma.ProjectUpdateInput = {
    revision: { increment: 1 },
    lastEditedAt: new Date(),
  };

  if (typeof input.name === "string" && input.name.trim()) {
    data.name = input.name.trim().slice(0, 80);
  }
  if (input.content !== undefined) data.content = sanitizeContent(input.content) as Prisma.InputJsonValue;
  if (input.theme !== undefined) data.theme = sanitizeTheme(input.theme) as Prisma.InputJsonValue;
  if (input.meta !== undefined) data.meta = sanitizeMeta(input.meta) as Prisma.InputJsonValue;

  const updated = await prisma.project.update({
    where: { id: input.projectId },
    data,
    select: { id: true, revision: true, updatedAt: true, name: true },
  });

  // Snapshot roughly every tenth revision so history stays useful without
  // writing a row per keystroke.
  if (updated.revision % 10 === 0) {
    await snapshotVersion(input.projectId, input.plan).catch(() => {});
  }

  return updated;
}

export async function snapshotVersion(projectId: string, plan: Plan, label?: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { content: true, theme: true, meta: true, revision: true },
  });
  if (!project) return null;

  const version = await prisma.projectVersion.create({
    data: {
      projectId,
      label: label?.slice(0, 60) ?? `Revision ${project.revision}`,
      revision: project.revision,
      content: project.content as Prisma.InputJsonValue,
      theme: project.theme as Prisma.InputJsonValue,
      meta: project.meta as Prisma.InputJsonValue,
    },
    select: { id: true, label: true, createdAt: true, revision: true },
  });

  // Trim to the plan's retention.
  const keep = limitsFor(plan).versionHistory;
  const stale = await prisma.projectVersion.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    skip: keep,
    select: { id: true },
  });
  if (stale.length) {
    await prisma.projectVersion.deleteMany({ where: { id: { in: stale.map((v) => v.id) } } });
  }

  return version;
}

export async function duplicateProject(projectId: string, userId: string, plan: Plan) {
  const source = await getOwnedProject(projectId, userId);

  const quotaSlot = await reserveProjectSlot(userId, plan);
  if (!quotaSlot.ok) throw new ApiError(402, "upgrade_required", quotaSlot.reason);

  const name = `${source.name} copy`.slice(0, 80);
  const slug = await uniqueProjectSlug(userId, name);

  try {
    return await prisma.project.create({
      data: {
        userId,
        templateId: source.templateId,
        name,
        slug,
        content: source.content as Prisma.InputJsonValue,
        theme: source.theme as Prisma.InputJsonValue,
        meta: source.meta as Prisma.InputJsonValue,
        thumbnail: source.thumbnail,
        lastEditedAt: new Date(),
      },
      select: { id: true, name: true, slug: true },
    });
  } catch (error) {
    await releaseProjectSlot(userId);
    throw error;
  }
}

export async function deleteProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  });
  if (!project) throw new ApiError(404, "not_found", "Project not found.");
  if (project.userId !== userId) throw new ApiError(403, "forbidden", "Not your project.");

  await prisma.$transaction([
    prisma.project.delete({ where: { id: projectId } }),
    prisma.user.update({
      where: { id: userId },
      data: { projectCount: { decrement: 1 } },
    }),
  ]);
}
