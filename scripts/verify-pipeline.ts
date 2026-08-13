/**
 * End-to-end check of the generation pipeline, with no database or network:
 *
 *   analyze HTML → apply a content map → generate static files → zip → assert
 *
 * Run with `npm run verify:pipeline`. It exercises the exact code path the ZIP
 * download uses, including the sanitisers, so a regression in patching or
 * escaping fails here rather than in production.
 */

import JSZip from "jszip";
import { analyzeHtml } from "@/lib/templates/analyze";
import { generateSite } from "@/lib/templates/generate";
import { bundledTemplates } from "@/generated/templates";
import type { ProjectContent } from "@/lib/templates/types";

const REF = "nova-ai-platform";

async function main() {
  const bundle = bundledTemplates[REF];
  if (!bundle) {
    console.error(`Template "${REF}" is not in the compiled index. Run npm run templates:index.`);
    process.exit(1);
  }

  const { elements } = analyzeHtml(bundle.files["index.html"], "index.html");
  const authored = elements.filter((element) => !/^e\d+$/.test(element.key));
  const ordinal = elements.filter((element) => /^e\d+$/.test(element.key));

  console.log(`Analyzed ${elements.length} editable elements`);
  console.log(`  authored keys: ${authored.length}`);
  console.log(`  ordinal keys:  ${ordinal.length}`);

  const content: ProjectContent = {
    "index.html": {
      // Text, including a deliberate XSS attempt.
      "hero.title": { text: "My Custom Headline <script>alert(1)</script>" },
      "hero.subtitle": { text: "Replaced subtitle text." },
      // Image swap with alt text.
      "hero.image": { src: "https://example.com/mine.png", alt: "My picture" },
      // Hostile href.
      "nav.cta": { href: "javascript:alert(1)", text: "Sign up" },
      // Visibility.
      "footer.copyright": { hidden: true },
      // Style override on an auto-discovered node.
      [ordinal[3]?.key ?? "e3"]: { style: { color: "#ff0000", "font-size": "72px" } },
    },
  };

  const files = await generateSite({
    template: {
      id: "verify",
      slug: REF,
      storage: "bundled",
      sourceRef: REF,
      entryFile: "index.html",
      attribution: "Test attribution line",
    },
    content,
    theme: { vars: { "--accent": "#ff00ff" }, customCss: ".hero{padding-top:0}" },
    meta: { title: "My Site", description: "A description" },
  });

  console.log(`\nGenerated ${files.length} files`);
  for (const file of files) {
    console.log(`  ${file.path.padEnd(22)} ${file.bytes.byteLength} bytes`);
  }

  const html = new TextDecoder().decode(
    files.find((file) => file.path === "index.html")!.bytes,
  );

  const checks: [string, boolean][] = [
    ["headline replaced", html.includes("My Custom Headline")],
    ["script tag escaped", html.includes("&lt;script&gt;") && !html.includes("<script>alert(1)")],
    ["subtitle replaced", html.includes("Replaced subtitle text.")],
    ["image source swapped", html.includes("https://example.com/mine.png")],
    ["alt text applied", html.includes('alt="My picture"')],
    ["javascript: href rejected", !html.includes("javascript:alert")],
    ["hidden element removed", !html.includes("All rights reserved")],
    ["inline style applied", html.includes("font-size:72px")],
    ["theme variable injected", html.includes("--accent:#ff00ff")],
    ["custom css injected", html.includes(".hero{padding-top:0}")],
    ["meta title applied", html.includes("<title>My Site</title>")],
    ["attribution preserved", html.includes("Test attribution line")],
    ["editor bridge excluded", !html.includes("orion-preview")],
    ["editor keys excluded", !html.includes("data-orion-key")],
    ["stylesheet link intact", html.includes('href="style.css"')],
    ["no base href leaked", !html.includes("<base href")],
    ["multi-page output", files.some((file) => file.path === "about.html")],
  ];

  console.log("");
  let failed = 0;
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
    if (!ok) failed += 1;
  }

  // Editor mode: only genuinely editable nodes become click targets, the bridge
  // is present, and ordinal addressing survives a removed element.
  const { applyContentToHtml } = await import("@/lib/templates/render");

  const editorHtml = applyContentToHtml(bundle.files["index.html"], "index.html", content, {
    mode: "editor",
    baseHref: "/api/render/test/",
  });

  const taggedKeys = [...editorHtml.matchAll(/data-orion-key="([^"]+)"/g)]
    .map((match) => match[1])
    // The bridge script contains the selector as a JS string literal; ignore it.
    .filter((key) => !key.includes("CSS.escape"));
  const lastOrdinal = ordinal[ordinal.length - 1];

  const editorChecks: [string, boolean][] = [
    ["editor bridge injected", editorHtml.includes("orion-preview")],
    ["only editable nodes tagged", taggedKeys.length === elements.length - 1], // one is hidden
    ["authored keys tagged", taggedKeys.includes("hero.subtitle")],
    [
      "ordinals stable after a removal",
      lastOrdinal ? taggedKeys.includes(lastOrdinal.key) : true,
    ],
    ["hidden node not tagged", !taggedKeys.includes("footer.copyright")],
  ];

  for (const [label, ok] of editorChecks) {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
    if (!ok) failed += 1;
  }

  const zip = new JSZip();
  for (const file of files) zip.file(file.path, file.bytes);
  const archive = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const roundTrip = await JSZip.loadAsync(archive);

  console.log(
    `\nArchive: ${(archive.byteLength / 1024).toFixed(1)} kB, ${Object.keys(roundTrip.files).length} entries`,
  );

  if (failed) {
    console.error(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
