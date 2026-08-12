/**
 * Writes the bundled template collection to /templates.
 *
 *   npm run templates:generate
 *
 * Each template becomes a plain static site — index.html, style.css, script.js,
 * optional extra pages and a poster image — plus a template.json manifest the
 * seeder reads. Nothing here depends on Orion at runtime.
 */

import fs from "node:fs";
import path from "node:path";
import { CATALOG, type TemplateDef } from "./templates/catalog";
import { THEMES } from "./templates/themes";
import { baseCss, baseJs, esc, renderSection, type SectionData } from "./templates/sections";

const ROOT = path.resolve(process.cwd(), "templates");

function fill(def: TemplateDef): SectionData {
  const d = def.data;
  return {
    nav: d.nav ?? [
      { label: "Features", href: "#features" },
      { label: "About", href: "#features" },
      { label: "Contact", href: "#contact" },
    ],
    ctaPrimary: d.ctaPrimary ?? { label: "Get started", href: "#contact" },
    ...d,
  } as SectionData;
}

function page(def: TemplateDef, body: string, title: string, description: string): string {
  const theme = THEMES[def.theme];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
${theme.fontsHref ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="${theme.fontsHref}">` : ""}
<link rel="stylesheet" href="style.css">
</head>
<body>
${body}
<script src="script.js" defer></script>
</body>
</html>
`;
}

/** A secondary page so multi-page editing and export are exercised. */
function secondaryPage(def: TemplateDef, data: SectionData, kind: "about" | "contact"): string {
  const nav = renderSection(def.layout.find((l) => l.startsWith("nav:")) as never, data);
  const footer = renderSection("block:footer", data);

  const body =
    kind === "about"
      ? `${nav}
<section class="section">
  <div class="wrap narrow">
    <p class="eyebrow" data-editable="about.eyebrow">About</p>
    <h1 data-editable="about.title">${esc(data.brand)}</h1>
    <p class="lede" data-editable="about.intro">${esc(data.subhead)}</p>
    <p class="lede" data-editable="about.body">Replace this paragraph with your story — how you started, who you help, and what makes the way you work different. Two or three short paragraphs is usually plenty.</p>
    <div class="hero-actions"><a class="btn btn-primary" data-editable="about.cta" href="contact.html">Get in touch</a></div>
  </div>
</section>
${footer}`
      : `${nav}
${renderSection("block:contact", {
  ...data,
  contact: data.contact ?? {
    email: "hello@example.com",
    phone: "+1 (555) 000-0000",
    address: "Your street address",
    hours: "Mon — Fri, 9am to 5pm",
  },
})}
${footer}`;

  const title = kind === "about" ? `About — ${data.brand}` : `Contact — ${data.brand}`;
  return page(def, body, title, def.description);
}

/** Miniature poster used as the marketplace card image before a live preview loads. */
function poster(def: TemplateDef): string {
  const t = THEMES[def.theme];
  const isDark = t.scheme !== "light";
  const barColor = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" role="img" aria-label="${esc(def.name)} preview">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${t.bg}"/>
      <stop offset="100%" stop-color="${t.bgAlt}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <rect x="0" y="0" width="800" height="56" fill="${t.bgAlt}"/>
  <rect x="32" y="24" width="86" height="10" rx="5" fill="${t.accent}" opacity="0.9"/>
  <rect x="560" y="24" width="48" height="10" rx="5" fill="${barColor}"/>
  <rect x="624" y="24" width="48" height="10" rx="5" fill="${barColor}"/>
  <rect x="692" y="18" width="76" height="22" rx="11" fill="${t.accent}" opacity="0.9"/>
  <rect x="64" y="126" width="440" height="30" rx="6" fill="${t.ink}" opacity="0.92"/>
  <rect x="64" y="170" width="336" height="30" rx="6" fill="${t.ink}" opacity="0.72"/>
  <rect x="64" y="228" width="392" height="12" rx="6" fill="${t.inkMuted}" opacity="0.6"/>
  <rect x="64" y="250" width="300" height="12" rx="6" fill="${t.inkMuted}" opacity="0.45"/>
  <rect x="64" y="296" width="132" height="38" rx="${t.buttonShape === "pill" ? 19 : 8}" fill="${t.accent}"/>
  <rect x="212" y="296" width="120" height="38" rx="${t.buttonShape === "pill" ? 19 : 8}" fill="none" stroke="${barColor}" stroke-width="2"/>
  <rect x="64" y="392" width="208" height="150" rx="14" fill="${t.surface}" stroke="${t.border}"/>
  <rect x="296" y="392" width="208" height="150" rx="14" fill="${t.surface}" stroke="${t.border}"/>
  <rect x="528" y="392" width="208" height="150" rx="14" fill="${t.surface}" stroke="${t.border}"/>
  <circle cx="96" cy="424" r="14" fill="${t.accent}" opacity="0.35"/>
  <circle cx="328" cy="424" r="14" fill="${t.accent}" opacity="0.35"/>
  <circle cx="560" cy="424" r="14" fill="${t.accent}" opacity="0.35"/>
  <rect x="82" y="456" width="130" height="10" rx="5" fill="${t.ink}" opacity="0.7"/>
  <rect x="314" y="456" width="130" height="10" rx="5" fill="${t.ink}" opacity="0.7"/>
  <rect x="546" y="456" width="130" height="10" rx="5" fill="${t.ink}" opacity="0.7"/>
  <rect x="82" y="480" width="168" height="8" rx="4" fill="${t.inkMuted}" opacity="0.5"/>
  <rect x="314" y="480" width="168" height="8" rx="4" fill="${t.inkMuted}" opacity="0.5"/>
  <rect x="546" y="480" width="168" height="8" rx="4" fill="${t.inkMuted}" opacity="0.5"/>
  <rect x="520" y="96" width="216" height="216" rx="18" fill="${t.surface}" stroke="${t.border}"/>
</svg>
`;
}

function write(file: string, contents: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents, "utf8");
}

function main() {
  fs.mkdirSync(ROOT, { recursive: true });

  const seen = new Set<string>();
  let written = 0;

  for (const def of CATALOG) {
    if (seen.has(def.slug)) throw new Error(`Duplicate template slug: ${def.slug}`);
    seen.add(def.slug);

    const theme = THEMES[def.theme];
    if (!theme) throw new Error(`Unknown theme "${def.theme}" for ${def.slug}`);

    const data = fill(def);
    const body = def.layout.map((key) => renderSection(key, data)).join("\n");
    const dir = path.join(ROOT, def.slug);

    const title = `${data.brand} — ${def.name.split("—").pop()?.trim() ?? def.name}`;
    write(path.join(dir, "index.html"), page(def, body, title, def.description));
    write(path.join(dir, "style.css"), baseCss(theme));
    write(path.join(dir, "script.js"), baseJs());
    write(path.join(dir, "thumbnail.svg"), poster(def));

    const pages = ["index.html"];
    const multiPage = data.nav.length >= 3;
    if (multiPage) {
      write(path.join(dir, "about.html"), secondaryPage(def, data, "about"));
      write(path.join(dir, "contact.html"), secondaryPage(def, data, "contact"));
      pages.push("about.html", "contact.html");
    }

    write(
      path.join(dir, "template.json"),
      `${JSON.stringify(
        {
          name: def.name,
          slug: def.slug,
          category: def.category,
          tags: def.tags,
          description: def.description,
          theme: def.theme,
          colorScheme: theme.scheme,
          tier: def.tier ?? "FREE",
          featured: def.featured ?? false,
          entryFile: "index.html",
          pages,
          thumbnail: "thumbnail.svg",
          license: "MIT",
          author: "Orion",
          source: "https://github.com/orion/templates",
          attribution: null,
          responsive: true,
        },
        null,
        2,
      )}\n`,
    );

    written += 1;
  }

  console.log(`Generated ${written} templates into ${ROOT}`);
}

main();
