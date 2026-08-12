import type { Theme } from "./themes";

/**
 * Section library used to compose the bundled template collection.
 *
 * Every editable node carries a `data-editable` key so the Orion editor
 * shows human labels instead of DOM ordinals, and the keys stay stable if a
 * template is ever regenerated.
 */

export const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export type Link = { label: string; href: string };
export type Item = { title: string; body: string; icon?: string; meta?: string };
export type Quote = { quote: string; name: string; role: string };
export type PlanRow = {
  name: string;
  price: string;
  cadence: string;
  features: string[];
  featured?: boolean;
  cta: string;
};

export type SectionData = {
  brand: string;
  nav: Link[];
  ctaPrimary: Link;
  ctaSecondary?: Link;
  eyebrow?: string;
  headline: string;
  subhead: string;
  heroImage?: string;
  heroImageAlt?: string;
  badges?: string[];
  logos?: string[];
  stats?: { value: string; label: string }[];
  featuresTitle?: string;
  featuresIntro?: string;
  features?: Item[];
  gallery?: { src: string; caption: string }[];
  menu?: { section: string; items: { name: string; description: string; price: string }[] }[];
  steps?: Item[];
  plans?: PlanRow[];
  quotes?: Quote[];
  team?: { name: string; role: string; initials: string }[];
  faq?: { q: string; a: string }[];
  contact?: { email: string; phone: string; address: string; hours?: string };
  footerNote?: string;
  social?: Link[];
  ctaTitle?: string;
  ctaBody?: string;
};

const K = (section: string, name: string) => `${section}.${name}`;

/* ------------------------------------------------------------------ atoms */

function button(
  key: string,
  link: Link,
  variant: "primary" | "ghost" | "outline" = "primary",
) {
  return `<a class="btn btn-${variant}" data-editable="${key}" data-editable-label="${esc(link.label)} button" href="${esc(link.href)}">${esc(link.label)}</a>`;
}

function avatar(initials: string, accent: string) {
  return `<span class="avatar" aria-hidden="true" style="background:${accent}1f;color:${accent}">${esc(initials)}</span>`;
}

function icon(name: string) {
  const paths: Record<string, string> = {
    bolt: "M13 2 3 14h7l-1 8 10-12h-7l1-8z",
    shield: "M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3z",
    spark: "M12 3v6m0 6v6m-9-9h6m6 0h6M5.6 5.6l4.2 4.2m4.4 4.4 4.2 4.2m0-12.8-4.2 4.2m-4.4 4.4-4.2 4.2",
    layers: "m12 3 9 5-9 5-9-5 9-5zm9 11-9 5-9-5",
    chart: "M4 20V10m6 10V4m6 16v-7m4 7H3",
    globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 0c3 3 3 15 0 18M3 12h18",
    code: "m9 6-6 6 6 6m6-12 6 6-6 6",
    heart: "M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z",
    star: "m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8L12 4z",
    clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v5l3 2",
    users: "M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm11 12v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8",
    lock: "M6 11h12v10H6V11zm3 0V7a3 3 0 0 1 6 0v4",
    rocket: "M5 15c-1 3-1 5-1 5s2 0 5-1m-4-4 2 2m6.5-13C10 5 7 10 6.5 13.5L10.5 17.5C14 17 19 14 20.5 5.5 20.6 4.6 19.4 3.4 18.5 3.5z",
    leaf: "M4 20c8 0 16-4 16-16C10 4 4 10 4 20zm0 0 8-8",
    camera: "M4 8h3l2-3h6l2 3h3v11H4V8zm8 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
    cart: "M4 5h2l2 11h9l2-7H7m1 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  };
  const path = paths[name] ?? paths.spark;
  return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
}

/* --------------------------------------------------------------- sections */

export const NAVS = {
  simple: (d: SectionData) => `
<header class="nav" id="top">
  <div class="wrap nav-inner">
    <a class="brand" data-editable="${K("nav", "brand")}" data-editable-label="Brand name" href="#top">${esc(d.brand)}</a>
    <nav class="nav-links" aria-label="Main">
      ${d.nav.map((l, i) => `<a data-editable="${K("nav", `link${i + 1}`)}" href="${esc(l.href)}">${esc(l.label)}</a>`).join("")}
    </nav>
    <div class="nav-actions">${button(K("nav", "cta"), d.ctaPrimary, "primary")}</div>
    <button class="nav-toggle" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
  </div>
</header>`,

  centered: (d: SectionData) => `
<header class="nav nav-center" id="top">
  <div class="wrap nav-inner">
    <nav class="nav-links nav-left" aria-label="Main">
      ${d.nav.slice(0, 2).map((l, i) => `<a data-editable="${K("nav", `link${i + 1}`)}" href="${esc(l.href)}">${esc(l.label)}</a>`).join("")}
    </nav>
    <a class="brand brand-center" data-editable="${K("nav", "brand")}" href="#top">${esc(d.brand)}</a>
    <nav class="nav-links nav-right" aria-label="Secondary">
      ${d.nav.slice(2, 4).map((l, i) => `<a data-editable="${K("nav", `link${i + 3}`)}" href="${esc(l.href)}">${esc(l.label)}</a>`).join("")}
    </nav>
    <button class="nav-toggle" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
  </div>
</header>`,

  minimal: (d: SectionData) => `
<header class="nav nav-minimal" id="top">
  <div class="wrap nav-inner">
    <a class="brand" data-editable="${K("nav", "brand")}" href="#top">${esc(d.brand)}</a>
    <nav class="nav-links" aria-label="Main">
      ${d.nav.map((l, i) => `<a data-editable="${K("nav", `link${i + 1}`)}" href="${esc(l.href)}">${esc(l.label)}</a>`).join("")}
    </nav>
    <button class="nav-toggle" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
  </div>
</header>`,
};

export const HEROES = {
  centered: (d: SectionData) => `
<section class="hero hero-centered">
  <div class="wrap hero-inner">
    ${d.eyebrow ? `<p class="eyebrow" data-editable="${K("hero", "eyebrow")}">${esc(d.eyebrow)}</p>` : ""}
    <h1 data-editable="${K("hero", "title")}" data-editable-label="Hero headline">${esc(d.headline)}</h1>
    <p class="lede" data-editable="${K("hero", "subtitle")}" data-editable-label="Hero subtitle">${esc(d.subhead)}</p>
    <div class="hero-actions">
      ${button(K("hero", "cta"), d.ctaPrimary)}
      ${d.ctaSecondary ? button(K("hero", "ctaAlt"), d.ctaSecondary, "ghost") : ""}
    </div>
    ${d.heroImage ? `<div class="hero-media"><img data-editable="${K("hero", "image")}" data-editable-label="Hero image" src="${esc(d.heroImage)}" alt="${esc(d.heroImageAlt ?? "Product preview")}" loading="lazy" width="1200" height="750"></div>` : ""}
  </div>
</section>`,

  split: (d: SectionData) => `
<section class="hero hero-split">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      ${d.eyebrow ? `<p class="eyebrow" data-editable="${K("hero", "eyebrow")}">${esc(d.eyebrow)}</p>` : ""}
      <h1 data-editable="${K("hero", "title")}">${esc(d.headline)}</h1>
      <p class="lede" data-editable="${K("hero", "subtitle")}">${esc(d.subhead)}</p>
      <div class="hero-actions">
        ${button(K("hero", "cta"), d.ctaPrimary)}
        ${d.ctaSecondary ? button(K("hero", "ctaAlt"), d.ctaSecondary, "outline") : ""}
      </div>
      ${d.badges?.length ? `<ul class="badges">${d.badges.map((b, i) => `<li data-editable="${K("hero", `badge${i + 1}`)}">${esc(b)}</li>`).join("")}</ul>` : ""}
    </div>
    <div class="hero-visual">
      <img data-editable="${K("hero", "image")}" src="${esc(d.heroImage ?? "https://picsum.photos/seed/hero/1000/1100")}" alt="${esc(d.heroImageAlt ?? "Showcase")}" loading="lazy" width="1000" height="1100">
    </div>
  </div>
</section>`,

  cover: (d: SectionData) => `
<section class="hero hero-cover" data-editable="${K("hero", "background")}" data-editable-type="background" data-editable-label="Hero background" style="background-image:url('${esc(d.heroImage ?? "https://picsum.photos/seed/cover/1800/1100")}')">
  <div class="hero-scrim"></div>
  <div class="wrap hero-inner">
    ${d.eyebrow ? `<p class="eyebrow" data-editable="${K("hero", "eyebrow")}">${esc(d.eyebrow)}</p>` : ""}
    <h1 data-editable="${K("hero", "title")}">${esc(d.headline)}</h1>
    <p class="lede" data-editable="${K("hero", "subtitle")}">${esc(d.subhead)}</p>
    <div class="hero-actions">
      ${button(K("hero", "cta"), d.ctaPrimary)}
      ${d.ctaSecondary ? button(K("hero", "ctaAlt"), d.ctaSecondary, "ghost") : ""}
    </div>
  </div>
</section>`,

  terminal: (d: SectionData) => `
<section class="hero hero-terminal">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      ${d.eyebrow ? `<p class="eyebrow" data-editable="${K("hero", "eyebrow")}">${esc(d.eyebrow)}</p>` : ""}
      <h1 data-editable="${K("hero", "title")}">${esc(d.headline)}</h1>
      <p class="lede" data-editable="${K("hero", "subtitle")}">${esc(d.subhead)}</p>
      <div class="hero-actions">
        ${button(K("hero", "cta"), d.ctaPrimary)}
        ${d.ctaSecondary ? button(K("hero", "ctaAlt"), d.ctaSecondary, "outline") : ""}
      </div>
    </div>
    <div class="terminal" aria-hidden="true">
      <div class="terminal-bar"><i></i><i></i><i></i></div>
      <pre class="terminal-body" data-editable="${K("hero", "code")}" data-editable-label="Code sample">$ npx create-app my-project
<span class="ok">✓</span> Installing dependencies
<span class="ok">✓</span> Generating routes
<span class="ok">✓</span> Ready in 1.2s

  Local  http://localhost:3000</pre>
    </div>
  </div>
</section>`,

  stacked: (d: SectionData) => `
<section class="hero hero-stacked">
  <div class="wrap">
    <h1 class="display" data-editable="${K("hero", "title")}">${esc(d.headline)}</h1>
    <div class="hero-stacked-row">
      <p class="lede" data-editable="${K("hero", "subtitle")}">${esc(d.subhead)}</p>
      <div class="hero-actions">
        ${button(K("hero", "cta"), d.ctaPrimary)}
        ${d.ctaSecondary ? button(K("hero", "ctaAlt"), d.ctaSecondary, "ghost") : ""}
      </div>
    </div>
    ${d.heroImage ? `<div class="hero-media wide"><img data-editable="${K("hero", "image")}" src="${esc(d.heroImage)}" alt="${esc(d.heroImageAlt ?? "Preview")}" loading="lazy" width="1600" height="900"></div>` : ""}
  </div>
</section>`,

  editorial: (d: SectionData) => `
<section class="hero hero-editorial">
  <div class="wrap hero-grid">
    <div class="hero-visual">
      <img data-editable="${K("hero", "image")}" src="${esc(d.heroImage ?? "https://picsum.photos/seed/editorial/900/1200")}" alt="${esc(d.heroImageAlt ?? "Portrait")}" loading="lazy" width="900" height="1200">
    </div>
    <div class="hero-copy">
      ${d.eyebrow ? `<p class="eyebrow" data-editable="${K("hero", "eyebrow")}">${esc(d.eyebrow)}</p>` : ""}
      <h1 data-editable="${K("hero", "title")}">${esc(d.headline)}</h1>
      <p class="lede" data-editable="${K("hero", "subtitle")}">${esc(d.subhead)}</p>
      <div class="hero-actions">${button(K("hero", "cta"), d.ctaPrimary)}</div>
    </div>
  </div>
</section>`,
};

export const BLOCKS = {
  logos: (d: SectionData) =>
    !d.logos?.length
      ? ""
      : `
<section class="logos">
  <div class="wrap">
    <p class="logos-label" data-editable="${K("logos", "label")}">Trusted by teams building the future</p>
    <ul class="logo-row">
      ${d.logos.map((l, i) => `<li data-editable="${K("logos", `item${i + 1}`)}">${esc(l)}</li>`).join("")}
    </ul>
  </div>
</section>`,

  stats: (d: SectionData) =>
    !d.stats?.length
      ? ""
      : `
<section class="stats">
  <div class="wrap stat-grid">
    ${d.stats
      .map(
        (s, i) => `<div class="stat">
      <span class="stat-value" data-editable="${K("stats", `value${i + 1}`)}">${esc(s.value)}</span>
      <span class="stat-label" data-editable="${K("stats", `label${i + 1}`)}">${esc(s.label)}</span>
    </div>`,
      )
      .join("")}
  </div>
</section>`,

  featureGrid: (d: SectionData) =>
    !d.features?.length
      ? ""
      : `
<section class="section features" id="features">
  <div class="wrap">
    <div class="section-head">
      <h2 data-editable="${K("features", "title")}">${esc(d.featuresTitle ?? "Everything you need")}</h2>
      ${d.featuresIntro ? `<p class="section-intro" data-editable="${K("features", "intro")}">${esc(d.featuresIntro)}</p>` : ""}
    </div>
    <div class="grid grid-3">
      ${d.features
        .map(
          (f, i) => `<article class="card">
        <span class="card-icon">${icon(f.icon ?? "spark")}</span>
        <h3 data-editable="${K("features", `title${i + 1}`)}">${esc(f.title)}</h3>
        <p data-editable="${K("features", `body${i + 1}`)}">${esc(f.body)}</p>
      </article>`,
        )
        .join("")}
    </div>
  </div>
</section>`,

  featureBento: (d: SectionData) =>
    !d.features?.length
      ? ""
      : `
<section class="section features" id="features">
  <div class="wrap">
    <div class="section-head">
      <h2 data-editable="${K("features", "title")}">${esc(d.featuresTitle ?? "Built for the way you work")}</h2>
      ${d.featuresIntro ? `<p class="section-intro" data-editable="${K("features", "intro")}">${esc(d.featuresIntro)}</p>` : ""}
    </div>
    <div class="bento">
      ${d.features
        .slice(0, 5)
        .map(
          (f, i) => `<article class="card bento-${i + 1}">
        <span class="card-icon">${icon(f.icon ?? "layers")}</span>
        <h3 data-editable="${K("features", `title${i + 1}`)}">${esc(f.title)}</h3>
        <p data-editable="${K("features", `body${i + 1}`)}">${esc(f.body)}</p>
      </article>`,
        )
        .join("")}
    </div>
  </div>
</section>`,

  featureAlternating: (d: SectionData) =>
    !d.features?.length
      ? ""
      : `
<section class="section features-alt" id="features">
  <div class="wrap">
    ${d.features
      .slice(0, 3)
      .map(
        (f, i) => `<div class="alt-row${i % 2 ? " reverse" : ""}">
      <div class="alt-copy">
        <span class="card-icon">${icon(f.icon ?? "bolt")}</span>
        <h2 data-editable="${K("features", `title${i + 1}`)}">${esc(f.title)}</h2>
        <p data-editable="${K("features", `body${i + 1}`)}">${esc(f.body)}</p>
      </div>
      <div class="alt-media">
        <img data-editable="${K("features", `image${i + 1}`)}" src="https://picsum.photos/seed/alt${i + 1}/900/620" alt="${esc(f.title)}" loading="lazy" width="900" height="620">
      </div>
    </div>`,
      )
      .join("")}
  </div>
</section>`,

  steps: (d: SectionData) =>
    !d.steps?.length
      ? ""
      : `
<section class="section steps" id="how">
  <div class="wrap">
    <div class="section-head">
      <h2 data-editable="${K("steps", "title")}">How it works</h2>
    </div>
    <ol class="step-list">
      ${d.steps
        .map(
          (s, i) => `<li class="step">
        <span class="step-num">${String(i + 1).padStart(2, "0")}</span>
        <h3 data-editable="${K("steps", `title${i + 1}`)}">${esc(s.title)}</h3>
        <p data-editable="${K("steps", `body${i + 1}`)}">${esc(s.body)}</p>
      </li>`,
        )
        .join("")}
    </ol>
  </div>
</section>`,

  gallery: (d: SectionData) =>
    !d.gallery?.length
      ? ""
      : `
<section class="section gallery" id="work">
  <div class="wrap">
    <div class="section-head">
      <h2 data-editable="${K("gallery", "title")}">Selected work</h2>
    </div>
    <div class="gallery-grid">
      ${d.gallery
        .map(
          (g, i) => `<figure class="shot">
        <img data-editable="${K("gallery", `image${i + 1}`)}" src="${esc(g.src)}" alt="${esc(g.caption)}" loading="lazy" width="800" height="600">
        <figcaption data-editable="${K("gallery", `caption${i + 1}`)}">${esc(g.caption)}</figcaption>
      </figure>`,
        )
        .join("")}
    </div>
  </div>
</section>`,

  menu: (d: SectionData) =>
    !d.menu?.length
      ? ""
      : `
<section class="section menu" id="menu">
  <div class="wrap">
    <div class="section-head">
      <h2 data-editable="${K("menu", "title")}">Menu</h2>
    </div>
    ${d.menu
      .map(
        (group, gi) => `<div class="menu-group">
      <h3 class="menu-group-title" data-editable="${K("menu", `group${gi + 1}`)}">${esc(group.section)}</h3>
      <ul class="menu-list">
        ${group.items
          .map(
            (item, ii) => `<li class="menu-item">
          <div class="menu-item-head">
            <span class="menu-item-name" data-editable="${K("menu", `g${gi + 1}name${ii + 1}`)}">${esc(item.name)}</span>
            <span class="menu-dots" aria-hidden="true"></span>
            <span class="menu-item-price" data-editable="${K("menu", `g${gi + 1}price${ii + 1}`)}">${esc(item.price)}</span>
          </div>
          <p class="menu-item-desc" data-editable="${K("menu", `g${gi + 1}desc${ii + 1}`)}">${esc(item.description)}</p>
        </li>`,
          )
          .join("")}
      </ul>
    </div>`,
      )
      .join("")}
  </div>
</section>`,

  pricing: (d: SectionData) =>
    !d.plans?.length
      ? ""
      : `
<section class="section pricing" id="pricing">
  <div class="wrap">
    <div class="section-head">
      <h2 data-editable="${K("pricing", "title")}">Simple pricing</h2>
      <p class="section-intro" data-editable="${K("pricing", "intro")}">No contracts. Cancel whenever you like.</p>
    </div>
    <div class="grid grid-${Math.min(d.plans.length, 3)}">
      ${d.plans
        .map(
          (p, i) => `<article class="plan${p.featured ? " plan-featured" : ""}">
        ${p.featured ? `<span class="plan-flag" data-editable="${K("pricing", `flag${i + 1}`)}">Most popular</span>` : ""}
        <h3 data-editable="${K("pricing", `name${i + 1}`)}">${esc(p.name)}</h3>
        <p class="plan-price"><span data-editable="${K("pricing", `price${i + 1}`)}">${esc(p.price)}</span><small data-editable="${K("pricing", `cadence${i + 1}`)}">${esc(p.cadence)}</small></p>
        <ul class="plan-features">
          ${p.features.map((f, fi) => `<li data-editable="${K("pricing", `p${i + 1}f${fi + 1}`)}">${esc(f)}</li>`).join("")}
        </ul>
        ${button(K("pricing", `cta${i + 1}`), { label: p.cta, href: "#contact" }, p.featured ? "primary" : "outline")}
      </article>`,
        )
        .join("")}
    </div>
  </div>
</section>`,

  testimonials: (d: SectionData) =>
    !d.quotes?.length
      ? ""
      : `
<section class="section quotes" id="testimonials">
  <div class="wrap">
    <div class="section-head">
      <h2 data-editable="${K("quotes", "title")}">What people say</h2>
    </div>
    <div class="grid grid-${Math.min(d.quotes.length, 3)}">
      ${d.quotes
        .map(
          (q, i) => `<figure class="quote">
        <blockquote data-editable="${K("quotes", `text${i + 1}`)}">${esc(q.quote)}</blockquote>
        <figcaption>
          ${avatar(q.name.slice(0, 2).toUpperCase(), "var(--accent)")}
          <span><strong data-editable="${K("quotes", `name${i + 1}`)}">${esc(q.name)}</strong><em data-editable="${K("quotes", `role${i + 1}`)}">${esc(q.role)}</em></span>
        </figcaption>
      </figure>`,
        )
        .join("")}
    </div>
  </div>
</section>`,

  team: (d: SectionData) =>
    !d.team?.length
      ? ""
      : `
<section class="section team" id="team">
  <div class="wrap">
    <div class="section-head"><h2 data-editable="${K("team", "title")}">The team</h2></div>
    <div class="grid grid-4">
      ${d.team
        .map(
          (m, i) => `<article class="member">
        ${avatar(m.initials, "var(--accent)")}
        <h3 data-editable="${K("team", `name${i + 1}`)}">${esc(m.name)}</h3>
        <p data-editable="${K("team", `role${i + 1}`)}">${esc(m.role)}</p>
      </article>`,
        )
        .join("")}
    </div>
  </div>
</section>`,

  faq: (d: SectionData) =>
    !d.faq?.length
      ? ""
      : `
<section class="section faq" id="faq">
  <div class="wrap narrow">
    <div class="section-head"><h2 data-editable="${K("faq", "title")}">Frequently asked</h2></div>
    <div class="faq-list">
      ${d.faq
        .map(
          (f, i) => `<details class="faq-item"${i === 0 ? " open" : ""}>
        <summary data-editable="${K("faq", `q${i + 1}`)}">${esc(f.q)}</summary>
        <p data-editable="${K("faq", `a${i + 1}`)}">${esc(f.a)}</p>
      </details>`,
        )
        .join("")}
    </div>
  </div>
</section>`,

  cta: (d: SectionData) => `
<section class="section cta-band" id="contact">
  <div class="wrap cta-inner">
    <h2 data-editable="${K("cta", "title")}">${esc(d.ctaTitle ?? "Ready when you are")}</h2>
    <p data-editable="${K("cta", "body")}">${esc(d.ctaBody ?? "Start today — it only takes a few minutes.")}</p>
    <div class="hero-actions">${button(K("cta", "button"), d.ctaPrimary)}</div>
  </div>
</section>`,

  contact: (d: SectionData) =>
    !d.contact
      ? ""
      : `
<section class="section contact" id="contact">
  <div class="wrap contact-grid">
    <div>
      <h2 data-editable="${K("contact", "title")}">Get in touch</h2>
      <p class="section-intro" data-editable="${K("contact", "intro")}">We reply to every message within one business day.</p>
      <ul class="contact-list">
        <li><span>Email</span><a data-editable="${K("contact", "email")}" href="mailto:${esc(d.contact.email)}">${esc(d.contact.email)}</a></li>
        <li><span>Phone</span><a data-editable="${K("contact", "phone")}" href="tel:${esc(d.contact.phone.replace(/[^\d+]/g, ""))}">${esc(d.contact.phone)}</a></li>
        <li><span>Address</span><p data-editable="${K("contact", "address")}">${esc(d.contact.address)}</p></li>
        ${d.contact.hours ? `<li><span>Hours</span><p data-editable="${K("contact", "hours")}">${esc(d.contact.hours)}</p></li>` : ""}
      </ul>
    </div>
    <form class="contact-form" novalidate>
      <label>Name<input type="text" name="name" placeholder="Your name" required></label>
      <label>Email<input type="email" name="email" placeholder="you@example.com" required></label>
      <label>Message<textarea name="message" rows="4" placeholder="How can we help?"></textarea></label>
      <button class="btn btn-primary" type="submit" data-editable="${K("contact", "submit")}">Send message</button>
      <p class="form-note">This form is a starting point — connect it to your own backend or a form service.</p>
    </form>
  </div>
</section>`,

  footer: (d: SectionData) => `
<footer class="footer">
  <div class="wrap footer-inner">
    <div class="footer-brand">
      <a class="brand" data-editable="${K("footer", "brand")}" href="#top">${esc(d.brand)}</a>
      <p data-editable="${K("footer", "note")}">${esc(d.footerNote ?? "Built with care.")}</p>
    </div>
    <nav class="footer-links" aria-label="Footer">
      ${d.nav.map((l, i) => `<a data-editable="${K("footer", `link${i + 1}`)}" href="${esc(l.href)}">${esc(l.label)}</a>`).join("")}
    </nav>
    ${
      d.social?.length
        ? `<nav class="footer-social" aria-label="Social">
      ${d.social.map((s, i) => `<a data-editable="${K("footer", `social${i + 1}`)}" href="${esc(s.href)}" rel="noopener">${esc(s.label)}</a>`).join("")}
    </nav>`
        : ""
    }
  </div>
  <div class="wrap footer-legal">
    <p data-editable="${K("footer", "copyright")}">© ${new Date().getFullYear()} ${esc(d.brand)}. All rights reserved.</p>
  </div>
</footer>`,
};

export type SectionKey =
  | `nav:${keyof typeof NAVS}`
  | `hero:${keyof typeof HEROES}`
  | `block:${keyof typeof BLOCKS}`;

export function renderSection(key: SectionKey, data: SectionData): string {
  const [kind, name] = key.split(":") as [string, string];
  if (kind === "nav") return NAVS[name as keyof typeof NAVS](data);
  if (kind === "hero") return HEROES[name as keyof typeof HEROES](data);
  return BLOCKS[name as keyof typeof BLOCKS](data);
}

/* -------------------------------------------------------------- generated CSS */

export function baseCss(theme: Theme): string {
  const t = theme;
  const btnRadius =
    t.buttonShape === "pill" ? "999px" : t.buttonShape === "square" ? t.radius : t.radiusLg;

  const texture =
    t.texture === "grid"
      ? `background-image:linear-gradient(${t.border} 1px,transparent 1px),linear-gradient(90deg,${t.border} 1px,transparent 1px);background-size:56px 56px;`
      : t.texture === "dots"
        ? `background-image:radial-gradient(${t.border} 1px,transparent 1px);background-size:22px 22px;`
        : t.texture === "glow"
          ? `background-image:radial-gradient(700px 380px at 50% -8%, ${t.accentSoft}, transparent 70%);`
          : t.texture === "mesh"
            ? `background-image:radial-gradient(520px 320px at 12% 0%, ${t.accentSoft}, transparent 65%),radial-gradient(620px 380px at 88% 12%, ${t.accentSoft}, transparent 62%);`
            : t.texture === "noise"
              ? `background-image:radial-gradient(600px 340px at 78% 0%, ${t.accentSoft}, transparent 68%);`
              : "";

  return `/* ${t.id} — generated by Orion. Plain CSS, yours to edit. */
:root{
  --bg:${t.bg};
  --bg-alt:${t.bgAlt};
  --surface:${t.surface};
  --border:${t.border};
  --ink:${t.ink};
  --ink-muted:${t.inkMuted};
  --accent:${t.accent};
  --accent-ink:${t.accentInk};
  --accent-soft:${t.accentSoft};
  --radius:${t.radius};
  --radius-lg:${t.radiusLg};
  --shadow:${t.shadow};
  --wrap:${t.maxWidth};
  --pad:${t.sectionPad};
  --font-body:${t.bodyFont};
  --font-head:${t.headingFont};
}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font-body);font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block}
a{color:inherit;text-decoration:none}
h1,h2,h3,h4{font-family:var(--font-head);font-weight:${t.headingWeight};letter-spacing:${t.headingSpacing};line-height:1.08;margin:0}
h1{font-size:clamp(2.6rem,6.4vw,4.6rem)}
h2{font-size:clamp(2rem,4vw,3rem)}
h3{font-size:1.2rem;line-height:1.35}
p{margin:0}
ul,ol{margin:0;padding:0;list-style:none}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
.wrap{width:100%;max-width:var(--wrap);margin:0 auto;padding:0 24px}
.wrap.narrow{max-width:760px}
.section{padding:var(--pad) 0}
.section-head{max-width:660px;margin:0 0 56px}
.section-intro{color:var(--ink-muted);margin-top:16px;font-size:1.05rem}
.eyebrow{font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin:0 0 20px;font-weight:600}
.lede{color:var(--ink-muted);font-size:clamp(1.05rem,1.8vw,1.28rem);max-width:56ch;margin:22px 0 0;line-height:1.6}

/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 28px;border-radius:${btnRadius};font-weight:600;font-size:.98rem;border:1px solid transparent;transition:transform .25s cubic-bezier(.16,1,.3,1),background .25s,border-color .25s,opacity .25s;cursor:pointer;font-family:inherit}
.btn:hover{transform:translateY(-1px)}
.btn-primary{background:var(--accent);color:var(--accent-ink)}
.btn-primary:hover{opacity:.9}
.btn-outline{border-color:var(--border);color:var(--ink)}
.btn-outline:hover{border-color:var(--accent);color:var(--accent)}
.btn-ghost{color:var(--ink);background:var(--surface);border-color:var(--border)}

/* nav */
.nav{position:sticky;top:0;z-index:50;backdrop-filter:saturate(160%) blur(14px);background:color-mix(in srgb, var(--bg) 78%, transparent);border-bottom:1px solid var(--border)}
.nav-inner{display:flex;align-items:center;justify-content:space-between;gap:24px;height:72px}
.brand{font-family:var(--font-head);font-weight:700;font-size:1.12rem;letter-spacing:-.02em}
.nav-links{display:flex;gap:30px;align-items:center}
.nav-links a{color:var(--ink-muted);font-size:.94rem;transition:color .2s${t.uppercaseNav ? ";text-transform:uppercase;letter-spacing:.12em;font-size:.76rem" : ""}}
.nav-links a:hover{color:var(--ink)}
.nav-center .nav-inner{display:grid;grid-template-columns:1fr auto 1fr}
.nav-center .nav-right{justify-content:flex-end}
.brand-center{text-align:center}
.nav-toggle{display:none;flex-direction:column;gap:5px;background:none;border:0;padding:8px;cursor:pointer}
.nav-toggle span{width:22px;height:1.5px;background:var(--ink);display:block;transition:transform .3s,opacity .3s}
.nav.open .nav-links{display:flex}

/* hero */
.hero{position:relative;overflow:hidden;${texture}}
.hero-inner{padding:clamp(80px,12vw,148px) 24px clamp(60px,8vw,96px);text-align:center;display:flex;flex-direction:column;align-items:center}
.hero-centered .lede{margin-inline:auto;text-align:center}
.hero-actions{display:flex;gap:14px;flex-wrap:wrap;margin-top:36px;justify-content:inherit}
.hero-media{margin-top:64px;width:100%;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--border);box-shadow:var(--shadow)}
.hero-media.wide{margin-top:72px}
.hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:64px;align-items:center;padding-top:clamp(72px,10vw,124px);padding-bottom:clamp(72px,10vw,124px)}
.hero-visual img{border-radius:var(--radius-lg);border:1px solid var(--border);box-shadow:var(--shadow);width:100%;object-fit:cover;aspect-ratio:4/5}
.hero-split .hero-actions,.hero-terminal .hero-actions,.hero-editorial .hero-actions{justify-content:flex-start}
.hero-cover{min-height:min(88vh,780px);display:flex;align-items:center;background-size:cover;background-position:center;color:#fff}
.hero-cover .hero-inner{position:relative;z-index:2}
.hero-cover .lede{color:rgba(255,255,255,.86)}
.hero-scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.28),rgba(0,0,0,.72))}
.hero-stacked{padding:clamp(72px,10vw,132px) 0 0}
.display{font-size:clamp(3rem,9vw,7rem);line-height:.98}
.hero-stacked-row{display:flex;justify-content:space-between;align-items:flex-end;gap:40px;margin-top:44px;flex-wrap:wrap}
.hero-stacked-row .lede{margin:0}
.badges{display:flex;gap:10px;flex-wrap:wrap;margin-top:32px}
.badges li{font-size:.78rem;padding:7px 14px;border:1px solid var(--border);border-radius:999px;color:var(--ink-muted);background:var(--surface)}
.terminal{border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;background:var(--bg-alt);box-shadow:var(--shadow)}
.terminal-bar{display:flex;gap:7px;padding:14px 16px;border-bottom:1px solid var(--border)}
.terminal-bar i{width:11px;height:11px;border-radius:50%;background:var(--border)}
.terminal-body{margin:0;padding:24px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.86rem;line-height:1.8;color:var(--ink-muted);white-space:pre-wrap}
.terminal-body .ok{color:var(--accent)}

/* logos */
.logos{padding:56px 0;border-block:1px solid var(--border);background:var(--bg-alt)}
.logos-label{text-align:center;color:var(--ink-muted);font-size:.82rem;letter-spacing:.12em;text-transform:uppercase;margin-bottom:28px}
.logo-row{display:flex;flex-wrap:wrap;justify-content:center;gap:16px 56px}
.logo-row li{font-family:var(--font-head);font-weight:600;font-size:1.06rem;color:var(--ink);opacity:.55;transition:opacity .3s}
.logo-row li:hover{opacity:1}

/* grids + cards */
.grid{display:grid;gap:22px}
.grid-2{grid-template-columns:repeat(2,1fr)}
.grid-3{grid-template-columns:repeat(3,1fr)}
.grid-4{grid-template-columns:repeat(4,1fr)}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:30px;transition:transform .4s cubic-bezier(.16,1,.3,1),border-color .3s}
.card:hover{transform:translateY(-4px);border-color:var(--accent)}
.card h3{margin:18px 0 10px}
.card p{color:var(--ink-muted);font-size:.97rem}
.card-icon{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:var(--radius);background:var(--accent-soft);color:var(--accent)}
.ico{width:20px;height:20px}
.bento{display:grid;grid-template-columns:repeat(6,1fr);gap:22px}
.bento-1{grid-column:span 4}
.bento-2{grid-column:span 2}
.bento-3{grid-column:span 2}
.bento-4{grid-column:span 2}
.bento-5{grid-column:span 2}

/* alternating */
.alt-row{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;padding:56px 0}
.alt-row.reverse .alt-copy{order:2}
.alt-copy h2{margin:20px 0 16px;font-size:clamp(1.7rem,3vw,2.3rem)}
.alt-copy p{color:var(--ink-muted)}
.alt-media img{border-radius:var(--radius-lg);border:1px solid var(--border);box-shadow:var(--shadow);width:100%;aspect-ratio:3/2;object-fit:cover}

/* stats */
.stats{padding:64px 0;border-block:1px solid var(--border)}
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:32px;text-align:center}
.stat-value{display:block;font-family:var(--font-head);font-size:clamp(2rem,4vw,3rem);font-weight:${t.headingWeight};letter-spacing:${t.headingSpacing};color:var(--accent)}
.stat-label{color:var(--ink-muted);font-size:.9rem}

/* steps */
.step-list{display:grid;grid-template-columns:repeat(3,1fr);gap:36px;counter-reset:step}
.step{border-top:1px solid var(--border);padding-top:26px}
.step-num{font-family:var(--font-head);font-size:.85rem;color:var(--accent);letter-spacing:.1em}
.step h3{margin:14px 0 10px}
.step p{color:var(--ink-muted);font-size:.97rem}

/* gallery */
.gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.shot{margin:0;overflow:hidden;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface)}
.shot img{aspect-ratio:4/3;object-fit:cover;width:100%;transition:transform .6s cubic-bezier(.16,1,.3,1)}
.shot:hover img{transform:scale(1.04)}
.shot figcaption{padding:16px 18px;font-size:.9rem;color:var(--ink-muted)}

/* menu */
.menu-group{margin-bottom:56px}
.menu-group-title{font-size:.82rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:24px}
.menu-list{display:grid;gap:26px}
.menu-item-head{display:flex;align-items:baseline;gap:12px}
.menu-item-name{font-family:var(--font-head);font-size:1.1rem;font-weight:${t.headingWeight}}
.menu-dots{flex:1;border-bottom:1px dotted var(--border);transform:translateY(-4px)}
.menu-item-price{color:var(--accent);font-weight:600}
.menu-item-desc{color:var(--ink-muted);font-size:.94rem;margin-top:6px;max-width:60ch}

/* pricing */
.plan{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:34px;display:flex;flex-direction:column;position:relative}
.plan-featured{border-color:var(--accent);box-shadow:var(--shadow)}
.plan-flag{position:absolute;top:-12px;left:34px;background:var(--accent);color:var(--accent-ink);font-size:.72rem;font-weight:700;padding:5px 12px;border-radius:999px;letter-spacing:.04em}
.plan-price{display:flex;align-items:baseline;gap:8px;margin:18px 0 26px}
.plan-price span{font-family:var(--font-head);font-size:2.6rem;font-weight:${t.headingWeight}}
.plan-price small{color:var(--ink-muted);font-size:.9rem}
.plan-features{display:grid;gap:12px;margin-bottom:30px;flex:1}
.plan-features li{color:var(--ink-muted);font-size:.95rem;padding-left:24px;position:relative}
.plan-features li::before{content:"";position:absolute;left:0;top:.55em;width:12px;height:7px;border-left:1.6px solid var(--accent);border-bottom:1.6px solid var(--accent);transform:rotate(-45deg)}

/* quotes */
.quote{margin:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:30px}
.quote blockquote{margin:0 0 22px;font-size:1.04rem;line-height:1.6}
.quote figcaption{display:flex;align-items:center;gap:12px}
.quote figcaption span{display:flex;flex-direction:column}
.quote figcaption em{font-style:normal;color:var(--ink-muted);font-size:.86rem}
.avatar{width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.82rem;font-weight:700;letter-spacing:.02em;flex-shrink:0}

/* team */
.member{text-align:center;padding:28px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--surface)}
.member .avatar{width:66px;height:66px;font-size:1.1rem;margin:0 auto 18px}
.member h3{font-size:1.02rem}
.member p{color:var(--ink-muted);font-size:.88rem;margin-top:4px}

/* faq */
.faq-list{display:grid;gap:0;border-top:1px solid var(--border)}
.faq-item{border-bottom:1px solid var(--border);padding:22px 0}
.faq-item summary{cursor:pointer;font-family:var(--font-head);font-size:1.05rem;font-weight:${t.headingWeight};list-style:none;display:flex;justify-content:space-between;gap:20px}
.faq-item summary::-webkit-details-marker{display:none}
.faq-item summary::after{content:"+";color:var(--accent);font-size:1.3rem;line-height:1;transition:transform .3s}
.faq-item[open] summary::after{transform:rotate(45deg)}
.faq-item p{color:var(--ink-muted);margin-top:14px;max-width:68ch}

/* cta */
.cta-band{background:var(--bg-alt);border-block:1px solid var(--border)}
.cta-inner{text-align:center;display:flex;flex-direction:column;align-items:center;gap:18px}
.cta-inner p{color:var(--ink-muted);max-width:52ch}
.cta-inner .hero-actions{justify-content:center;margin-top:14px}

/* contact */
.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:start}
.contact-list{margin-top:36px;display:grid;gap:20px}
.contact-list li{display:grid;grid-template-columns:96px 1fr;gap:16px;align-items:baseline;border-top:1px solid var(--border);padding-top:16px}
.contact-list span{color:var(--ink-muted);font-size:.82rem;letter-spacing:.1em;text-transform:uppercase}
.contact-form{display:grid;gap:16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:30px}
.contact-form label{display:grid;gap:8px;font-size:.86rem;color:var(--ink-muted)}
.contact-form input,.contact-form textarea{font-family:inherit;font-size:.97rem;padding:13px 15px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg);color:var(--ink);width:100%}
.contact-form input:focus,.contact-form textarea:focus{outline:none;border-color:var(--accent)}
.form-note{font-size:.78rem;color:var(--ink-muted)}

/* footer */
.footer{border-top:1px solid var(--border);padding:64px 0 32px;background:var(--bg-alt)}
.footer-inner{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:40px}
.footer-brand p{color:var(--ink-muted);font-size:.92rem;margin-top:14px;max-width:36ch}
.footer-links,.footer-social{display:grid;gap:12px;align-content:start}
.footer-links a,.footer-social a{color:var(--ink-muted);font-size:.92rem;transition:color .2s}
.footer-links a:hover,.footer-social a:hover{color:var(--ink)}
.footer-legal{margin-top:48px;padding-top:24px;border-top:1px solid var(--border);color:var(--ink-muted);font-size:.84rem}

/* reveal */
[data-reveal]{opacity:0;transform:translateY(20px)}
[data-reveal].in{opacity:1;transform:none;transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}

@media (max-width:960px){
  .hero-grid,.alt-row,.contact-grid{grid-template-columns:1fr;gap:44px}
  .alt-row.reverse .alt-copy{order:0}
  .grid-3,.grid-4,.gallery-grid,.step-list,.stat-grid{grid-template-columns:repeat(2,1fr)}
  .bento{grid-template-columns:repeat(2,1fr)}
  .bento-1,.bento-2,.bento-3,.bento-4,.bento-5{grid-column:span 1}
  .footer-inner{grid-template-columns:1fr 1fr}
}
@media (max-width:640px){
  body{font-size:16px}
  .section{padding:72px 0}
  .nav-toggle{display:flex}
  .nav-links{display:none;position:absolute;top:72px;left:0;right:0;flex-direction:column;gap:0;background:var(--bg);border-bottom:1px solid var(--border);padding:12px 24px 20px}
  .nav.open .nav-links{display:flex}
  .nav-links a{padding:12px 0;border-bottom:1px solid var(--border);width:100%}
  .nav-center .nav-inner{grid-template-columns:1fr auto 1fr}
  .nav-actions{display:none}
  .grid-2,.grid-3,.grid-4,.gallery-grid,.step-list,.stat-grid,.bento,.footer-inner{grid-template-columns:1fr}
  .hero-stacked-row{flex-direction:column;align-items:flex-start}
  .contact-list li{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important;scroll-behavior:auto!important}
  [data-reveal]{opacity:1;transform:none}
}`;
}

export function baseJs(): string {
  return `/* Small, dependency-free behaviour. Yours to edit or delete. */
(function () {
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav-toggle');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('.nav-links a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (event) {
      var id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.section, .hero-media, .card, .shot').forEach(function (el, i) {
      el.setAttribute('data-reveal', '');
      el.style.transitionDelay = (i % 4) * 60 + 'ms';
      observer.observe(el);
    });
  }
})();`;
}
