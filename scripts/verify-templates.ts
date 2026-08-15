/**
 * Checks the bundled template collection.
 *
 *   npm run verify:templates
 *
 * Three passes, cheapest first: the catalogue as authored, the theme palettes,
 * then the files actually written to /templates. Everything here runs without
 * a browser or a database — see verify-templates-render.ts for the checks that
 * need real Chrome.
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { CATALOG } from "./templates/catalog";
import { CATALOG_KINETIC } from "./templates/catalog-kinetic";
import { THEMES } from "./templates/themes";
import { KINETIC_THEMES } from "./templates/themes-kinetic";

const ROOT = path.resolve(process.cwd(), "templates");

let failures = 0;
const fail = (m: string) => {
  failures += 1;
  console.log(`  FAIL  ${m}`);
};

/* ────────────────────────────────────────────────────────────── contrast */

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ───────────────────────────────────────────────────────────── catalogue */

console.log("catalogue");

const slugs = CATALOG.map((t) => t.slug);
const dupes = [...new Set(slugs.filter((s, i) => slugs.indexOf(s) !== i))];
if (dupes.length) fail(`duplicate slugs: ${dupes.join(", ")}`);

for (const t of CATALOG) {
  if (!THEMES[t.theme]) fail(`${t.slug}: unknown theme "${t.theme}"`);
  if (!t.layout.length) fail(`${t.slug}: empty layout`);
}

// The kinetic collection carries extra promises: an asymmetric hero, content
// in every slot its layout budgets for, and no two neighbours sharing a theme.
const CENTRED = ["hero:centered", "hero:cover", "hero:stacked"];
for (const t of CATALOG_KINETIC) {
  if (!t.kinetic) fail(`${t.slug}: missing kinetic flag`);

  const hero = t.layout.find((l) => l.startsWith("hero:"));
  if (!hero) fail(`${t.slug}: no hero`);
  else if (CENTRED.includes(hero)) fail(`${t.slug}: centred hero ${hero}`);

  if (!t.data.features?.length) fail(`${t.slug}: no features`);
  if (!t.data.stats?.length) fail(`${t.slug}: no stats`);
  if (t.layout.includes("block:ticker") && !(t.data.badges?.length || t.data.logos?.length)) {
    fail(`${t.slug}: layout has a ticker but no words for it`);
  }
}

let adjacent = 0;
for (let i = 1; i < CATALOG_KINETIC.length; i += 1) {
  if (CATALOG_KINETIC[i].theme === CATALOG_KINETIC[i - 1].theme) adjacent += 1;
}
if (adjacent > 4) fail(`${adjacent} adjacent same-theme pairs — the grid will band`);

const categories = new Set(CATALOG_KINETIC.map((t) => t.category));
console.log(`  ${CATALOG.length} templates, ${CATALOG_KINETIC.length} kinetic across ${categories.size} genres`);

/* ──────────────────────────────────────────────────────────────── themes */

console.log("themes");

for (const [name, t] of Object.entries(THEMES)) {
  // The accent is used both as a fill behind accentInk and as small text on
  // the page ground, so it has to clear 4.5:1 in both directions.
  const checks: [string, string, string, number][] = [
    ["ink on bg", t.ink, t.bg, 4.5],
    ["inkMuted on bg", t.inkMuted, t.bg, 4.5],
    ["inkMuted on bgAlt", t.inkMuted, t.bgAlt, 4.5],
    ["accentInk on accent", t.accentInk, t.accent, 4.5],
    ["accent on bg", t.accent, t.bg, 4.5],
  ];
  for (const [label, a, b, min] of checks) {
    const r = ratio(a, b);
    if (r < min) fail(`${name}: ${label} is ${r.toFixed(2)}:1, needs ${min}`);
  }
}

const faces = new Set(Object.values(KINETIC_THEMES).map((t) => t.headingFont.split(",")[0]));
if (faces.size < Object.keys(KINETIC_THEMES).length) {
  fail(`only ${faces.size} distinct display faces across ${Object.keys(KINETIC_THEMES).length} themes`);
}
for (const [name, t] of Object.entries(KINETIC_THEMES)) {
  const banned = `${t.headingFont} ${t.bodyFont}`.match(/\b(Inter|Roboto|Arial)\b/)?.[0];
  if (banned) fail(`${name}: uses ${banned}`);
}
console.log(`  ${Object.keys(KINETIC_THEMES).length} kinetic themes, ${faces.size} distinct display faces`);

/* ─────────────────────────────────────────────────────────────── on disk */

console.log("generated files");

const dirs = fs.existsSync(ROOT)
  ? fs.readdirSync(ROOT).filter((d) => fs.existsSync(path.join(ROOT, d, "template.json")))
  : [];

if (dirs.length !== CATALOG.length) {
  fail(`${dirs.length} directories on disk for ${CATALOG.length} catalogue entries — run templates:generate`);
}

let kinetic = 0;
for (const slug of dirs) {
  const dir = path.join(ROOT, slug);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "template.json"), "utf8"));

  for (const p of manifest.pages as string[]) {
    if (!fs.existsSync(path.join(dir, p))) fail(`${slug}: manifest lists a missing page, ${p}`);
  }

  // script.js is served verbatim; a syntax error there fails silently.
  const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
  try {
    new vm.Script(js, { filename: `${slug}/script.js` });
  } catch (e) {
    fail(`${slug}: script.js — ${(e as Error).message}`);
  }

  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const editables = (html.match(/data-editable=/g) ?? []).length;
  if (editables < 12) fail(`${slug}: only ${editables} editable nodes`);

  if (!manifest.kinetic) continue;
  kinetic += 1;

  const css = fs.readFileSync(path.join(dir, "style.css"), "utf8");
  if (!/\.k-progress/.test(css)) fail(`${slug}: kinetic css missing`);
  if (!/k-progress|data-enter/.test(js)) fail(`${slug}: kinetic js missing`);
  if (!/prefers-reduced-motion/.test(css)) fail(`${slug}: no reduced-motion guard`);

  // The brief ruled out floating glow lights, so catch the two ways they
  // usually reappear: a big soft radial bloom, or a heavy blur halo.
  if (/radial-gradient[^;]*(circle|ellipse)[^;]*at [0-9]+% [0-9]+%/.test(css)) {
    fail(`${slug}: floating radial glow`);
  }
  if (/filter:\s*blur\((?:[4-9]\d|\d{3,})px\)/.test(css)) fail(`${slug}: glow blur`);

  // kineticJs() attaches its hooks at runtime, so assert the targets exist —
  // without them the script loads and does nothing.
  if (!/<section class="hero/.test(html)) fail(`${slug}: no hero for the headline reveal`);
  if (!/class="stat-value/.test(html)) fail(`${slug}: no counting figures`);
  if (!/k-index-row|k-data-row|k-ledger-rows|k-manifesto-body|grid-[234]|bento|stat-grid|gallery-grid/.test(html)) {
    fail(`${slug}: nothing for the entry animations to attach to`);
  }
}

console.log(`  ${dirs.length} generated, ${kinetic} kinetic`);

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} problem(s).`}`);
if (failures) process.exitCode = 1;
