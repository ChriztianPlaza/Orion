/**
 * Renders every animated template in real Chrome and checks the things only a
 * browser can answer: whether the display face actually loaded, whether
 * anything overflows the viewport, whether any reveal animation left content
 * invisible, and whether every text node is readable against the background
 * actually behind it.
 *
 *   npm run verify:templates:render
 *
 * The page-side code is a string rather than a function because tsx compiles
 * functions with esbuild's keepNames helpers, which reference a `__name` that
 * does not exist inside the browser context.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer, { type Browser, type Page } from "puppeteer-core";

const ROOT = path.resolve(process.cwd(), "templates");

function findLocalChrome(): string | null {
  return (
    [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ].find((p) => fs.existsSync(p)) ?? null
  );
}

type Report = {
  h1Font: string;
  bodyFont: string;
  wide: string[];
  emptySections: number;
  sections: number;
  stuck: string[];
  worstMargin: number;
  worstNode: string;
};

const PROBE = `(function () {
  var parse = function (s) {
    var m = s.match(/[\\d.]+/g) || ["0", "0", "0", "1"];
    return m.map(Number);
  };
  var rel = function (rgb) {
    var v = rgb.slice(0, 3).map(function (n) {
      var c = n / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  var cr = function (a, b) {
    var l = [rel(a), rel(b)].sort(function (x, y) { return y - x; });
    return (l[0] + 0.05) / (l[1] + 0.05);
  };

  /* The first ancestor painting an opaque background is what the text sits on. */
  var groundOf = function (el) {
    for (var p = el; p; p = p.parentElement) {
      var c = parse(getComputedStyle(p).backgroundColor);
      if ((c[3] === undefined ? 1 : c[3]) > 0.9) return c;
    }
    return parse(getComputedStyle(document.body).backgroundColor);
  };

  /* An element a clipping ancestor contains is not overflow — the marquee row
     is deliberately wider than the screen. */
  var clipped = function (el) {
    for (var p = el.parentElement; p; p = p.parentElement) {
      var o = getComputedStyle(p).overflowX;
      if (o === "hidden" || o === "clip" || o === "auto" || o === "scroll") return true;
    }
    return false;
  };

  var wide = [];
  var limit = document.documentElement.clientWidth + 1;
  Array.prototype.forEach.call(document.querySelectorAll("body *"), function (el) {
    if (wide.length >= 4) return;
    if (el.getBoundingClientRect().width > limit && !clipped(el)) {
      wide.push(el.tagName.toLowerCase() + "." + String(el.className || "").split(" ")[0]);
    }
  });

  var worst = 99;
  var worstNode = "";
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (var n = walker.nextNode(); n; n = walker.nextNode()) {
    var text = (n.nodeValue || "").trim();
    if (text.length < 2) continue;
    var el = n.parentElement;
    if (!el) continue;
    var cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
    var box = el.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) continue;

    /* Large text is held to 3:1, so compare each node against its own
       threshold and keep the tightest margin on the page. */
    var size = parseFloat(cs.fontSize);
    var bold = Number(cs.fontWeight) >= 700;
    var need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    var got = cr(parse(cs.color), groundOf(el));
    if (got / need < worst) {
      worst = got / need;
      worstNode = el.tagName.toLowerCase() + "." + String(el.className || "").split(" ")[0] +
        ' "' + text.slice(0, 22) + '" ' + got.toFixed(2) + ":1 needs " + need;
    }
  }

  /* Reveal animations hide their target until a class lands on it. If one
     never fires, the content is not un-animated — it is invisible. Anything
     on screen and still unmarked once the page has settled is a defect. */
  var stuck = [];
  Array.prototype.forEach.call(
    document.querySelectorAll("[data-wipe]:not(.in), [data-enter]:not(.in), [data-reveal]:not(.in)"),
    function (el) {
      var r = el.getBoundingClientRect();
      // Only meaningfully visible elements count — something peeking a few
      // pixels above the fold is simply waiting for a scroll, as designed.
      var shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      if (shown > 150 && r.height > 4 && stuck.length < 4) {
        stuck.push(el.tagName.toLowerCase() + "." + String(el.className || "").split(" ")[0]);
      }
    },
  );

  var h1 = document.querySelector(".hero h1");
  var sections = Array.prototype.slice.call(document.querySelectorAll("section"));
  return {
    stuck: stuck,
    h1Font: h1 ? getComputedStyle(h1).fontFamily.split(",")[0].replace(/"/g, "") : "",
    bodyFont: getComputedStyle(document.body).fontFamily.split(",")[0].replace(/"/g, ""),
    wide: wide,
    emptySections: sections.filter(function (s) { return s.getBoundingClientRect().height < 24; }).length,
    sections: sections.length,
    worstMargin: worst,
    worstNode: worstNode
  };
})()`;

async function inspect(page: Page, file: string): Promise<Report> {
  await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
  await page.evaluate("document.fonts.ready");
  // Long enough for the entry animations and the templates' own load-time
  // reveal sweep (which runs 400ms after load) to have finished.
  await new Promise((r) => setTimeout(r, 1400));
  return (await page.evaluate(PROBE)) as Report;
}

async function main() {
  const executablePath = findLocalChrome();
  if (!executablePath) throw new Error("No local Chrome found");

  const slugs = fs
    .readdirSync(ROOT)
    .filter((d) => {
      const m = path.join(ROOT, d, "template.json");
      const j = JSON.parse(fs.readFileSync(m, "utf8"));
      return j.kinetic || j.animated;
    })
    .sort();

  const browser: Browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  let failures = 0;
  const fail = (m: string) => {
    failures += 1;
    console.log(`  FAIL  ${m}`);
  };

  const fonts = new Set<string>();
  let tightest = 99;
  let tightestAt = "";

  for (const slug of slugs) {
    const r = await inspect(page, path.join(ROOT, slug, "index.html"));

    // Falling back to a system face means the webfont never arrived.
    if (/^(Times New Roman|serif|sans-serif|system-ui|Arial|Inter|Roboto)$/.test(r.h1Font)) {
      fail(`${slug}: display face fell back to ${r.h1Font}`);
    }
    fonts.add(r.h1Font);

    if (r.wide.length) fail(`${slug}: overflows — ${r.wide.join(", ")}`);
    if (r.emptySections) fail(`${slug}: ${r.emptySections}/${r.sections} sections collapsed`);
    if (r.stuck.length) fail(`${slug}: never revealed — ${r.stuck.join(", ")}`);

    // A margin below 1 means that node misses its own WCAG threshold.
    if (r.worstMargin < tightest) {
      tightest = r.worstMargin;
      tightestAt = `${slug} — ${r.worstNode}`;
    }
    if (r.worstMargin < 1) fail(`${slug}: ${r.worstNode}`);
  }

  await browser.close();

  console.log(`\nrendered: ${slugs.length}`);
  console.log(`distinct display faces: ${fonts.size}`);
  console.log(`  ${[...fonts].sort().join(", ")}`);
  console.log(`tightest text margin: ${tightest.toFixed(2)}x its threshold`);
  console.log(`  ${tightestAt}`);
  console.log(`\n${failures === 0 ? "all kinetic templates render clean" : `${failures} problem(s)`}`);
  if (failures) process.exitCode = 1;
}

void main();
