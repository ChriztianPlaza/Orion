import { button, esc, K, renderSection, type SectionData, type SectionKey } from "./sections";

/**
 * Asymmetric sections for the kinetic collection.
 *
 * The existing heroes centre a headline, drop a subtitle under it and follow
 * with a row of equal cards. It is the layout every template already uses, and
 * it flattens hierarchy: everything sits on the same axis at nearly the same
 * weight, so nothing leads.
 *
 * These do the opposite. Weight is deliberately uneven — a headline that takes
 * two thirds of the grid against a narrow column of facts, an index whose
 * numbers carry as much presence as its labels, a manifesto pinned beside
 * scrolling text. The eye is given somewhere to start.
 */

export const KINETIC_HEROES = {
  /* Headline owns the left two thirds; the right column is a hard-edged index. */
  offsetIndex: (d: SectionData) => `
<section class="hero hero-offset">
  <div class="wrap k-offset">
    <div class="k-offset-main">
      ${d.eyebrow ? `<p class="eyebrow" data-editable="${K("hero", "eyebrow")}">${esc(d.eyebrow)}</p>` : ""}
      <h1 data-editable="${K("hero", "title")}" data-editable-label="Hero headline">${esc(d.headline)}</h1>
      <div class="hero-actions">
        ${button(K("hero", "cta"), d.ctaPrimary)}
        ${d.ctaSecondary ? button(K("hero", "ctaAlt"), d.ctaSecondary, "outline") : ""}
      </div>
    </div>
    <aside class="k-offset-side">
      <p class="lede" data-editable="${K("hero", "subtitle")}" data-editable-label="Hero subtitle">${esc(d.subhead)}</p>
      ${
        d.stats?.length
          ? `<dl class="k-side-figures">${d.stats
              .slice(0, 3)
              .map(
                (s, i) => `<div>
        <dt class="stat-value" data-editable="${K("hero", `figure${i + 1}`)}">${esc(s.value)}</dt>
        <dd data-editable="${K("hero", `figureLabel${i + 1}`)}">${esc(s.label)}</dd>
      </div>`,
              )
              .join("")}</dl>`
          : ""
      }
    </aside>
  </div>
  ${
    d.heroImage
      ? `<div class="k-bleed hero-media"><img data-editable="${K("hero", "image")}" data-editable-label="Hero image" src="${esc(d.heroImage)}" alt="${esc(d.heroImageAlt ?? "")}" loading="eager" width="1600" height="800"></div>`
      : ""
  }
</section>`,

  /* Type at poster scale, breaking past the column; meta sits under it, right. */
  oversize: (d: SectionData) => `
<section class="hero hero-oversize">
  <div class="wrap">
    ${d.eyebrow ? `<p class="eyebrow" data-editable="${K("hero", "eyebrow")}">${esc(d.eyebrow)}</p>` : ""}
    <h1 class="k-poster" data-editable="${K("hero", "title")}" data-editable-label="Hero headline">${esc(d.headline)}</h1>
    <div class="k-oversize-foot">
      <p class="lede" data-editable="${K("hero", "subtitle")}">${esc(d.subhead)}</p>
      <div class="hero-actions">
        ${button(K("hero", "cta"), d.ctaPrimary)}
        ${d.ctaSecondary ? button(K("hero", "ctaAlt"), d.ctaSecondary, "outline") : ""}
      </div>
    </div>
  </div>
</section>`,

  /* Statement top-left, a ledger of figures bottom-right, one rule between. */
  ledger: (d: SectionData) => `
<section class="hero hero-ledger">
  <div class="wrap k-ledger">
    <div class="k-ledger-head">
      ${d.eyebrow ? `<p class="eyebrow" data-editable="${K("hero", "eyebrow")}">${esc(d.eyebrow)}</p>` : ""}
      <h1 data-editable="${K("hero", "title")}">${esc(d.headline)}</h1>
    </div>
    <div class="k-ledger-body">
      <p class="lede" data-editable="${K("hero", "subtitle")}">${esc(d.subhead)}</p>
      <div class="hero-actions">${button(K("hero", "cta"), d.ctaPrimary)}</div>
      ${
        d.stats?.length
          ? `<ul class="k-ledger-rows">${d.stats
              .map(
                (s, i) => `<li>
          <span class="stat-value" data-editable="${K("hero", `figure${i + 1}`)}">${esc(s.value)}</span>
          <span data-editable="${K("hero", `figureLabel${i + 1}`)}">${esc(s.label)}</span>
        </li>`,
              )
              .join("")}</ul>`
          : ""
      }
    </div>
  </div>
</section>`,

  /* No image, no columns — one long statement carrying the whole hero. */
  statement: (d: SectionData) => `
<section class="hero hero-statement">
  <div class="wrap">
    ${d.eyebrow ? `<p class="eyebrow" data-editable="${K("hero", "eyebrow")}">${esc(d.eyebrow)}</p>` : ""}
    <h1 class="k-statement" data-editable="${K("hero", "title")}">${esc(d.headline)}</h1>
    <div class="k-statement-foot">
      <p data-editable="${K("hero", "subtitle")}">${esc(d.subhead)}</p>
      ${button(K("hero", "cta"), d.ctaPrimary)}
    </div>
  </div>
</section>`,
};

export const KINETIC_BLOCKS = {
  /* A band of the dominant colour that never stops moving. */
  ticker: (d: SectionData) => {
    const words = (d.badges?.length ? d.badges : (d.logos ?? [])).slice(0, 8);
    if (!words.length) return "";
    return `
<section class="k-ticker" aria-label="Highlights">
  <div class="k-ticker-row">
    <span>${words.map((w, i) => `<em data-editable="${K("ticker", `item${i + 1}`)}">${esc(w)}</em>`).join("<i aria-hidden=\"true\">/</i>")}</span>
  </div>
</section>`;
  },

  /* Numbered rows. The number is not decoration — it is half the design. */
  indexList: (d: SectionData) =>
    !d.features?.length
      ? ""
      : `
<section class="section" id="features">
  <div class="wrap">
    <div class="section-head k-head-split">
      <h2 data-editable="${K("index", "title")}">${esc(d.featuresTitle ?? "What we do")}</h2>
      ${d.featuresIntro ? `<p class="section-intro" data-editable="${K("index", "intro")}">${esc(d.featuresIntro)}</p>` : ""}
    </div>
    <ol class="k-index">
      ${d.features
        .map(
          (f, i) => `<li class="k-index-row">
        <span class="k-index-num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
        <h3 data-editable="${K("index", `title${i + 1}`)}">${esc(f.title)}</h3>
        <p data-editable="${K("index", `body${i + 1}`)}">${esc(f.body)}</p>
      </li>`,
        )
        .join("")}
    </ol>
  </div>
</section>`,

  /* Title pinned to the left while the argument scrolls past it. */
  manifesto: (d: SectionData) =>
    !d.steps?.length
      ? ""
      : `
<section class="section k-manifesto-section" id="how">
  <div class="wrap k-manifesto">
    <div class="k-manifesto-pin">
      <h2 data-editable="${K("manifesto", "title")}">${esc(d.ctaTitle ?? "How it works")}</h2>
    </div>
    <div class="k-manifesto-body">
      ${d.steps
        .map(
          (s, i) => `<article>
        <span class="k-step-num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
        <h3 data-editable="${K("manifesto", `step${i + 1}`)}">${esc(s.title)}</h3>
        <p data-editable="${K("manifesto", `body${i + 1}`)}">${esc(s.body)}</p>
      </article>`,
        )
        .join("")}
    </div>
  </div>
</section>`,

  /* Figures as full-width rules, not a row of equal boxes. */
  dataRows: (d: SectionData) =>
    !d.stats?.length
      ? ""
      : `
<section class="section k-data">
  <div class="wrap">
    ${d.stats
      .map(
        (s, i) => `<div class="k-data-row">
      <span class="k-data-index" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
      <span class="stat-value k-data-value" data-editable="${K("data", `value${i + 1}`)}">${esc(s.value)}</span>
      <span class="k-data-label" data-editable="${K("data", `label${i + 1}`)}">${esc(s.label)}</span>
    </div>`,
      )
      .join("")}
  </div>
</section>`,

  /* One quote, set at display scale, carrying an entire section on its own. */
  bigQuote: (d: SectionData) => {
    const quote = d.quotes?.[0];
    if (!quote) return "";
    return `
<section class="section k-quote-section">
  <div class="wrap">
    <blockquote class="k-quote">
      <p data-editable="${K("bigquote", "quote")}">${esc(quote.quote)}</p>
      <footer>
        <span data-editable="${K("bigquote", "name")}">${esc(quote.name)}</span>
        <span data-editable="${K("bigquote", "role")}">${esc(quote.role)}</span>
      </footer>
    </blockquote>
  </div>
</section>`;
  },
};

/**
 * Keys the kinetic collection can use: everything the base library offers,
 * plus the asymmetric variants above.
 */
export type KineticSectionKey =
  | SectionKey
  | `hero:${keyof typeof KINETIC_HEROES}`
  | `block:${keyof typeof KINETIC_BLOCKS}`;

/*
 * Dispatch is one-way on purpose. Merging these into the base HEROES/BLOCKS
 * objects would make `sections.ts` import this file while this file imports
 * back — and `esc` and `K` are `const`, so whichever module evaluated second
 * would read them before initialisation. The themes hit exactly that and
 * compiled cleanly right up until it ran.
 */
export function renderKineticSection(key: KineticSectionKey, data: SectionData): string {
  const [kind, name] = key.split(":") as [string, string];

  if (kind === "hero" && name in KINETIC_HEROES) {
    return KINETIC_HEROES[name as keyof typeof KINETIC_HEROES](data);
  }
  if (kind === "block" && name in KINETIC_BLOCKS) {
    return KINETIC_BLOCKS[name as keyof typeof KINETIC_BLOCKS](data);
  }
  return renderSection(key as SectionKey, data);
}
