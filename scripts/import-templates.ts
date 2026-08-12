/**
 * Imports templates from a public GitHub repository.
 *
 *   npm run templates:import -- --repo owner/name
 *   npm run templates:import -- --repo owner/name --ref main --path templates --limit 50
 *   npm run templates:import -- --repo owner/name --dry-run
 *
 * What it does
 *   1. Reads the repository's license and refuses anything not clearly
 *      redistributable. `--allow-license X` can override for a repo you have
 *      written permission for; the override is recorded on every template.
 *   2. Downloads the zipball once and finds every folder containing an
 *      index.html — each becomes a template.
 *   3. Normalises paths, drops dangerous file types, and validates that binary
 *      assets really are the media they claim to be.
 *   4. Guesses a category and tags from the folder name and page content.
 *   5. Writes text files to Postgres and binaries to object storage.
 *
 * Nothing is executed from the repository. The files are only ever served back
 * into a sandboxed iframe.
 */

import JSZip from "jszip";
import { PrismaClient } from "@prisma/client";
import { normalizeTemplatePath, isTextAsset, mimeTypeFor } from "../src/lib/security/paths";
import { sniffImage, uploadObject, StorageNotConfiguredError } from "../src/lib/storage/blob";
import { slugify } from "../src/lib/utils";

const prisma = new PrismaClient();

/** SPDX ids that permit redistribution inside a commercial product. */
const PERMISSIVE_LICENSES = new Set([
  "MIT",
  "MIT-0",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "Unlicense",
  "CC0-1.0",
  "0BSD",
  "MPL-2.0",
  "CC-BY-4.0", // permitted, but requires attribution — recorded below
]);

const ATTRIBUTION_REQUIRED = new Set(["CC-BY-4.0", "MPL-2.0"]);

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  saas: ["saas", "software", "app", "platform", "dashboard", "product"],
  startup: ["startup", "launch", "waitlist", "coming-soon", "seed"],
  portfolio: ["portfolio", "resume", "cv", "personal-site", "designer", "developer-portfolio"],
  agency: ["agency", "studio", "creative-agency", "digital"],
  business: ["business", "corporate", "consulting", "company", "services", "law", "finance-firm"],
  restaurant: ["restaurant", "food", "cafe", "coffee", "menu", "bakery", "pizza", "bistro"],
  ecommerce: ["shop", "store", "ecommerce", "commerce", "product-page", "cart"],
  blog: ["blog", "magazine", "news", "article", "journal", "publication"],
  personal: ["personal", "profile", "about-me", "links", "bio"],
  photography: ["photo", "photography", "gallery", "album", "camera"],
  developer: ["docs", "documentation", "developer", "api", "open-source", "cli"],
  "landing-page": ["landing", "lead", "campaign", "promo", "conversion"],
  "real-estate": ["real-estate", "property", "housing", "realtor", "estate"],
  education: ["education", "course", "school", "academy", "learning", "university"],
  finance: ["finance", "bank", "invest", "accounting", "fintech", "crypto-finance"],
  healthcare: ["health", "medical", "clinic", "doctor", "dental", "hospital"],
  events: ["event", "conference", "wedding", "meetup", "ticket", "festival"],
  creative: ["creative", "art", "illustration", "music", "podcast", "film"],
  construction: ["construction", "builder", "architect", "contractor", "interior"],
  travel: ["travel", "tour", "hotel", "trip", "vacation", "resort"],
  fitness: ["fitness", "gym", "yoga", "workout", "health-club", "sport"],
  gaming: ["game", "gaming", "esports", "arcade", "studio-game"],
  technology: ["tech", "ai", "cloud", "security", "blockchain", "data", "cyber"],
};

type Args = {
  repo: string;
  ref: string;
  path: string;
  limit: number;
  dryRun: boolean;
  allowLicense: string | null;
  tier: "FREE" | "PRO";
  status: "PUBLISHED" | "DRAFT";
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string) => {
    const index = argv.indexOf(`--${flag}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  const repo = get("repo");
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    console.error("Usage: npm run templates:import -- --repo owner/name [--ref main] [--path sub/dir]");
    process.exit(1);
  }

  return {
    repo,
    ref: get("ref") ?? "",
    path: (get("path") ?? "").replace(/^\/+|\/+$/g, ""),
    limit: Number.parseInt(get("limit") ?? "200", 10) || 200,
    dryRun: argv.includes("--dry-run"),
    allowLicense: get("allow-license") ?? null,
    tier: get("tier") === "PRO" ? "PRO" : "FREE",
    status: get("status") === "DRAFT" ? "DRAFT" : "PUBLISHED",
  };
}

function githubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "orion-importer",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function fetchLicense(repo: string): Promise<{ spdx: string | null; name: string; url: string }> {
  const response = await fetch(`https://api.github.com/repos/${repo}/license`, {
    headers: githubHeaders(),
  });

  if (response.status === 404) return { spdx: null, name: "No license file", url: "" };
  if (!response.ok) throw new Error(`GitHub license lookup failed (${response.status})`);

  const payload = (await response.json()) as {
    license?: { spdx_id?: string; name?: string };
    html_url?: string;
  };

  const spdx = payload.license?.spdx_id ?? null;
  return {
    spdx: spdx === "NOASSERTION" ? null : spdx,
    name: payload.license?.name ?? "Unknown",
    url: payload.html_url ?? "",
  };
}

async function fetchRepoMeta(repo: string) {
  const response = await fetch(`https://api.github.com/repos/${repo}`, { headers: githubHeaders() });
  if (!response.ok) throw new Error(`GitHub repo lookup failed (${response.status})`);
  return (await response.json()) as {
    default_branch: string;
    description: string | null;
    owner: { login: string };
    html_url: string;
  };
}

async function downloadZipball(repo: string, ref: string): Promise<Uint8Array> {
  const response = await fetch(`https://api.github.com/repos/${repo}/zipball/${ref}`, {
    headers: githubHeaders(),
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`Zipball download failed (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

type Candidate = { dir: string; files: Map<string, JSZip.JSZipObject> };

/** A template is any folder that directly contains an index.html. */
function findCandidates(zip: JSZip, subPath: string): Candidate[] {
  const entries = Object.entries(zip.files).filter(([, file]) => !file.dir);

  // GitHub zipballs wrap everything in "owner-repo-sha/".
  const rootPrefix = entries[0]?.[0].split("/")[0] ?? "";
  const strip = (name: string) => {
    let rest = name.startsWith(`${rootPrefix}/`) ? name.slice(rootPrefix.length + 1) : name;
    if (subPath && rest.startsWith(`${subPath}/`)) rest = rest.slice(subPath.length + 1);
    else if (subPath) return null;
    return rest;
  };

  const byDir = new Map<string, Map<string, JSZip.JSZipObject>>();
  for (const [name, file] of entries) {
    const relative = strip(name);
    if (relative === null) continue;
    const segments = relative.split("/");
    const dir = segments.slice(0, -1).join("/");
    const list = byDir.get(dir) ?? new Map();
    list.set(segments[segments.length - 1], file);
    byDir.set(dir, list);
  }

  const candidates: Candidate[] = [];
  for (const [dir, files] of byDir) {
    if (!files.has("index.html")) continue;
    if (dir.split("/").some((segment) => segment.startsWith(".") || segment === "node_modules")) continue;
    candidates.push({ dir, files });
  }

  // Collect nested assets (css/, js/, images/) that live below a template root.
  return candidates.map((candidate) => {
    const collected = new Map(candidate.files);
    for (const [dir, files] of byDir) {
      if (dir === candidate.dir) continue;
      if (!candidate.dir ? dir.includes("/") : !dir.startsWith(`${candidate.dir}/`)) continue;
      // Do not absorb a nested template.
      if (files.has("index.html")) continue;
      const prefix = candidate.dir ? dir.slice(candidate.dir.length + 1) : dir;
      for (const [name, file] of files) collected.set(`${prefix}/${name}`, file);
    }
    return { dir: candidate.dir, files: collected };
  });
}

function guessCategory(text: string): string | null {
  const haystack = text.toLowerCase();
  let best: { slug: string; score: number } | null = null;

  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((sum, keyword) => (haystack.includes(keyword) ? sum + 1 : sum), 0);
    if (score > 0 && (!best || score > best.score)) best = { slug, score };
  }
  return best?.slug ?? null;
}

function guessTags(html: string, dir: string): string[] {
  const tags = new Set<string>();
  const haystack = `${dir} ${html.slice(0, 4000)}`.toLowerCase();

  if (/dark|#0{3,6}|background:\s*#0/.test(haystack)) tags.add("dark");
  else tags.add("light");
  if (haystack.includes("bootstrap")) tags.add("bootstrap");
  if (haystack.includes("tailwind")) tags.add("tailwind");
  if (haystack.includes("responsive")) tags.add("responsive");
  if (/one[- ]page|single[- ]page/.test(haystack)) tags.add("one-page");

  for (const segment of dir.split(/[/_-]/)) {
    const clean = segment.trim().toLowerCase();
    if (clean.length > 2 && clean.length < 18 && /^[a-z]+$/.test(clean)) tags.add(clean);
    if (tags.size >= 6) break;
  }
  return [...tags].slice(0, 6);
}

function titleOf(html: string, fallback: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match?.[1]?.replace(/\s+/g, " ").trim();
  if (title && title.length > 2 && title.length < 90) return title;
  return fallback
    .split(/[/_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function descriptionOf(html: string, fallback: string): string {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  return (match?.[1] ?? fallback).slice(0, 500);
}

async function main() {
  const args = parseArgs();

  console.log(`\nImporting from https://github.com/${args.repo}`);

  const [meta, license] = await Promise.all([fetchRepoMeta(args.repo), fetchLicense(args.repo)]);
  const ref = args.ref || meta.default_branch;

  console.log(`  license: ${license.name}${license.spdx ? ` (${license.spdx})` : ""}`);

  const effectiveLicense = args.allowLicense ?? license.spdx;
  if (!effectiveLicense || !PERMISSIVE_LICENSES.has(effectiveLicense)) {
    console.error(
      `\n  Refusing to import.\n` +
        `  "${license.name}" does not clearly permit redistribution inside a commercial product.\n` +
        `  Permitted: ${[...PERMISSIVE_LICENSES].join(", ")}.\n` +
        `  If you have written permission from the author, re-run with --allow-license <SPDX-ID>.\n`,
    );
    process.exit(2);
  }

  if (args.allowLicense && args.allowLicense !== license.spdx) {
    console.warn(
      `  Overriding the detected license with "${args.allowLicense}" — make sure you have permission.`,
    );
  }

  const attribution = ATTRIBUTION_REQUIRED.has(effectiveLicense)
    ? `Original template by ${meta.owner.login} (${meta.html_url}), used under ${effectiveLicense}.`
    : null;

  console.log(`  downloading ${ref}…`);
  const zipball = await downloadZipball(args.repo, ref);
  console.log(`  ${(zipball.byteLength / 1024 / 1024).toFixed(1)} MB`);

  const zip = await JSZip.loadAsync(zipball);
  const candidates = findCandidates(zip, args.path).slice(0, args.limit);
  console.log(`  found ${candidates.length} template folder(s)\n`);

  if (!candidates.length) {
    console.log("  Nothing to import. Try --path to point at the folder holding the templates.");
    return;
  }

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));

  let imported = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    const label = candidate.dir || "(repository root)";

    try {
      const indexEntry = candidate.files.get("index.html");
      if (!indexEntry) continue;
      const indexHtml = await indexEntry.async("string");

      const name = titleOf(indexHtml, candidate.dir || meta.owner.login);
      const slug = slugify(`${candidate.dir || args.repo.split("/")[1]}`) || slugify(name);

      const existing = await prisma.template.findUnique({ where: { slug }, select: { id: true } });
      if (existing) {
        console.log(`  · ${label} → skipped (slug "${slug}" already exists)`);
        skipped += 1;
        continue;
      }

      const categorySlug = guessCategory(`${candidate.dir} ${name} ${indexHtml.slice(0, 3000)}`);
      const tags = guessTags(indexHtml, candidate.dir);

      // Read and vet every file in the folder.
      const files: { path: string; bytes: Uint8Array; isText: boolean; text?: string }[] = [];
      let totalBytes = 0;

      for (const [relative, entry] of candidate.files) {
        const path = (() => {
          try {
            return normalizeTemplatePath(relative);
          } catch {
            return null;
          }
        })();
        if (!path) continue;

        const bytes = new Uint8Array(await entry.async("uint8array"));
        if (bytes.byteLength > 12 * 1024 * 1024) continue;

        const text = isTextAsset(path);
        if (!text) {
          const mime = mimeTypeFor(path);
          if (!/^(image|font|video|audio)\//.test(mime)) continue;
          if (mime.startsWith("image/") && !sniffImage(bytes)) continue;
        }

        totalBytes += bytes.byteLength;
        files.push({
          path,
          bytes,
          isText: text,
          text: text ? new TextDecoder().decode(bytes) : undefined,
        });
      }

      const htmlPages = files.filter((file) => /\.html?$/i.test(file.path)).map((file) => file.path);

      if (args.dryRun) {
        console.log(
          `  · ${label} → "${name}" [${categorySlug ?? "uncategorised"}] ${files.length} files, ${(totalBytes / 1024).toFixed(0)} kB`,
        );
        imported += 1;
        continue;
      }

      const template = await prisma.template.create({
        data: {
          slug,
          name,
          description: descriptionOf(indexHtml, meta.description ?? `Imported from ${args.repo}.`),
          categoryId: categorySlug ? (categoryBySlug.get(categorySlug) ?? null) : null,
          storage: "db",
          sourceRef: "",
          entryFile: "index.html",
          pages: ["index.html", ...htmlPages.filter((page) => page !== "index.html").sort()],
          status: args.status,
          tier: args.tier,
          license: effectiveLicense,
          author: meta.owner.login,
          source: `${meta.html_url}${candidate.dir ? `/tree/${ref}/${candidate.dir}` : ""}`,
          attribution,
          colorScheme: tags.includes("dark") ? "dark" : "light",
          responsive: /viewport/i.test(indexHtml),
          fileCount: files.length,
          totalBytes,
        },
        select: { id: true, slug: true },
      });

      for (const file of files) {
        if (file.isText) {
          await prisma.templateFile.create({
            data: {
              templateId: template.id,
              path: file.path,
              mimeType: mimeTypeFor(file.path),
              size: file.bytes.byteLength,
              content: file.text ?? "",
            },
          });
          continue;
        }

        try {
          const blob = await uploadObject({
            pathname: `templates/${template.slug}/${file.path}`,
            bytes: file.bytes,
            contentType: mimeTypeFor(file.path),
          });
          await prisma.templateFile.create({
            data: {
              templateId: template.id,
              path: file.path,
              mimeType: mimeTypeFor(file.path),
              size: file.bytes.byteLength,
              url: blob.url,
            },
          });
        } catch (error) {
          if (error instanceof StorageNotConfiguredError) continue;
          throw error;
        }
      }

      for (const tagName of tags) {
        const tagSlug = slugify(tagName);
        if (!tagSlug) continue;
        const tag = await prisma.tag.upsert({
          where: { slug: tagSlug },
          create: { slug: tagSlug, name: tagName },
          update: {},
        });
        await prisma.templateTag
          .create({ data: { templateId: template.id, tagId: tag.id } })
          .catch(() => {});
      }

      console.log(`  ✓ ${label} → ${slug} (${files.length} files)`);
      imported += 1;
    } catch (error) {
      console.error(`  ✗ ${label} → ${error instanceof Error ? error.message : String(error)}`);
      skipped += 1;
    }
  }

  console.log(
    `\n${args.dryRun ? "Would import" : "Imported"} ${imported} template(s), skipped ${skipped}.`,
  );
  if (attribution) {
    console.log(`Attribution recorded on every imported template:\n  ${attribution}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error("\nImport failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
