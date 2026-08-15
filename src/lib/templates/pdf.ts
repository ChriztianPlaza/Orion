import { existsSync } from "node:fs";
import puppeteer, { type Browser } from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import type { GeneratedFile } from "./generate";

/**
 * Renders a generated site to a single PDF.
 *
 * The archive is the real export; this is the "show someone the design" one.
 * Because a website is a continuous scroll rather than a set of fixed pages,
 * each HTML page is rendered as one tall PDF page instead of being cut into
 * A4 slices — pagination through the middle of a hero section looks broken in
 * a way a long page does not.
 */

/** Desktop width the site is rendered at. */
const VIEWPORT_WIDTH = 1280;

/** Guard against a runaway page producing a gigantic document. */
const MAX_PAGE_HEIGHT = 30000;

const decoder = new TextDecoder();

function isHtml(path: string) {
  return /\.html?$/i.test(path);
}

function dataUri(bytes: Uint8Array, mimeType: string) {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
}

/**
 * Folds every local dependency into the document.
 *
 * Chromium is handed the HTML directly rather than a directory, so relative
 * `href`/`src` references have nothing to resolve against. Inlining sidesteps
 * both that and the question of whether a serverless filesystem is readable.
 */
function inlineDocument(html: string, files: GeneratedFile[]): string {
  const byPath = new Map(files.map((file) => [file.path, file]));
  let out = html;

  // Stylesheets.
  out = out.replace(
    /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (match, href: string) => {
      if (/^https?:/i.test(href)) return match; // webfonts stay remote
      const file = byPath.get(href.replace(/^\.\//, ""));
      return file ? `<style>${decoder.decode(file.bytes)}</style>` : match;
    },
  );

  // Images.
  out = out.replace(/(<img[^>]+src=)["']([^"']+)["']/gi, (match, prefix: string, src: string) => {
    if (/^(https?:|data:)/i.test(src)) return match;
    const file = byPath.get(src.replace(/^\.\//, ""));
    return file ? `${prefix}"${dataUri(file.bytes, file.mimeType)}"` : match;
  });

  // Images referenced from inline styles, e.g. background-image:url(assets/…).
  out = out.replace(/url\((["']?)([^"')]+)\1\)/gi, (match, _quote: string, url: string) => {
    if (/^(https?:|data:|#)/i.test(url)) return match;
    const file = byPath.get(url.replace(/^\.\//, ""));
    return file ? `url("${dataUri(file.bytes, file.mimeType)}")` : match;
  });

  // Scripts are dropped: nothing in a template's behaviour survives into a
  // static render, and leaving them in only risks a hang while Chromium waits.
  out = out.replace(/<script[^>]*src=["'][^"']+["'][^>]*>\s*<\/script>/gi, "");

  return out;
}

/**
 * Serverless gets the bundled Chromium; a developer machine uses whatever
 * Chrome is already installed, since @sparticuz/chromium ships a Linux binary
 * that cannot run on Windows or macOS.
 */
async function launch(): Promise<Browser> {
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (serverless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: VIEWPORT_WIDTH, height: 900 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const local = process.env.CHROME_PATH ?? findLocalChrome();
  if (!local) {
    throw new Error(
      "No local Chrome found for PDF rendering. Set CHROME_PATH to a Chrome or Edge executable.",
    );
  }

  return puppeteer.launch({
    executablePath: local,
    defaultViewport: { width: VIEWPORT_WIDTH, height: 900 },
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
}

function findLocalChrome(): string | null {
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          ]
        : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];

  return candidates.find((path) => existsSync(path)) ?? null;
}

export async function renderSitePdf(files: GeneratedFile[], entryFile: string): Promise<Uint8Array> {
  const pages = files
    .filter((file) => isHtml(file.path))
    .sort((a, b) => (a.path === entryFile ? -1 : b.path === entryFile ? 1 : a.path.localeCompare(b.path)));

  if (!pages.length) throw new Error("The generated site has no pages to render.");

  const browser = await launch();
  const rendered: Uint8Array[] = [];

  try {
    for (const file of pages) {
      const page = await browser.newPage();

      /*
       * The motion layer hides content until it scrolls into view — in a
       * static render nothing ever does, so the page would come out blank
       * below the fold. Templates already collapse to their finished state
       * under reduced motion, so asking for it is enough.
       */
      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" },
        { name: "prefers-color-scheme", value: "light" },
      ]);

      await page.setContent(inlineDocument(decoder.decode(file.bytes), files), {
        waitUntil: "load",
        timeout: 20000,
      });

      // Everything local is inlined, so the only outstanding request is the
      // webfont — and text laid out in a fallback face then swapped is exactly
      // the kind of thing that gets baked into a PDF.
      await page
        .evaluate(() => document.fonts.ready.then(() => undefined))
        .catch(() => undefined);

      const height = Math.min(
        MAX_PAGE_HEIGHT,
        await page.evaluate(() => document.documentElement.scrollHeight),
      );

      rendered.push(
        await page.pdf({
          printBackground: true,
          width: `${VIEWPORT_WIDTH}px`,
          height: `${Math.max(height, 900)}px`,
          pageRanges: "1",
          margin: { top: "0", right: "0", bottom: "0", left: "0" },
        }),
      );

      await page.close();
    }
  } finally {
    await browser.close();
  }

  if (rendered.length === 1) return rendered[0];

  // Multi-page templates come out as one document, in nav order.
  const merged = await PDFDocument.create();
  for (const bytes of rendered) {
    const source = await PDFDocument.load(bytes);
    const copied = await merged.copyPages(source, source.getPageIndices());
    for (const page of copied) merged.addPage(page);
  }
  return merged.save();
}
