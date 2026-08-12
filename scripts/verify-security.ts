/**
 * Adversarial checks against the security primitives.
 *
 *   npm run verify:security
 *
 * These are the functions every piece of untrusted input passes through —
 * archive paths, editor values, redirect targets, uploads, deployment names.
 * A regression in any of them is a vulnerability rather than a bug, so they get
 * their own suite that runs without a database or network.
 */

import { normalizeTemplatePath, UnsafePathError } from "@/lib/security/paths";
import {
  sanitizeColor,
  sanitizeCssValue,
  sanitizeInlineHtml,
  sanitizeStyleMap,
  sanitizeUrl,
  stripTags,
  validateProjectName,
} from "@/lib/security/sanitize";
import { safeNextPath } from "@/lib/security/redirects";
import { sniffImage } from "@/lib/storage/blob";

let failures = 0;
let checks = 0;

function check(label: string, condition: boolean) {
  checks += 1;
  if (!condition) failures += 1;
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${label}`);
}

function section(title: string) {
  console.log(`\n${title}`);
}

/** normalizeTemplatePath throws on hostile input and returns null on junk. */
function pathResult(input: string): "throw" | "drop" | string {
  try {
    const value = normalizeTemplatePath(input);
    return value === null ? "drop" : value;
  } catch (error) {
    return error instanceof UnsafePathError ? "throw" : "drop";
  }
}

section("Archive paths (zip slip, traversal, dangerous types)");
check("rejects ../ traversal", pathResult("../../etc/passwd") === "throw");
check("rejects nested traversal", pathResult("assets/../../../etc/passwd") === "throw");
check("rejects windows drive letter", pathResult("C:/windows/system32/cmd.exe") === "throw");
check("rejects UNC path", pathResult("//server/share/file.html") === "throw");
check("rejects NUL byte", pathResult("index.html\u0000.php") === "throw");
check("strips leading slash", pathResult("/index.html") === "index.html");
check("normalises backslashes", pathResult("assets\\css\\main.css") === "assets/css/main.css");
check("drops .php", pathResult("shell.php") === "drop");
check("drops .htaccess", pathResult(".htaccess") === "drop");
check("drops dotfiles", pathResult(".env") === "drop");
check("drops node_modules", pathResult("node_modules/x/index.js") === "drop");
check("drops .git contents", pathResult(".git/config") === "drop");
check("rejects over-deep path", pathResult(Array(20).fill("a").join("/") + "/x.html") === "throw");
check("keeps a normal asset", pathResult("assets/img/hero.png") === "assets/img/hero.png");

section("URL sanitising (XSS via href / src)");
check("blocks javascript:", sanitizeUrl("javascript:alert(1)") === "");
check("blocks JaVaScRiPt: casing", sanitizeUrl("JaVaScRiPt:alert(1)") === "");
check("blocks vbscript:", sanitizeUrl("vbscript:msgbox(1)") === "");
check(
  "blocks control-char obfuscation",
  sanitizeUrl("java\u0000script:alert(1)") === "" ||
    !sanitizeUrl("java\u0000script:alert(1)").startsWith("javascript"),
);
check("blocks data: by default", sanitizeUrl("data:text/html,<script>alert(1)</script>") === "");
check("blocks data:text/html even when images allowed", sanitizeUrl("data:text/html,x", { allowDataImage: true }) === "");
check("allows data:image/png when opted in", sanitizeUrl("data:image/png;base64,AAAA", { allowDataImage: true }).startsWith("data:image/png"));
check("blocks file:", sanitizeUrl("file:///etc/passwd") === "");
check("allows https", sanitizeUrl("https://example.com/a").startsWith("https://example.com"));
check("allows mailto", sanitizeUrl("mailto:a@b.com").startsWith("mailto:"));
check("allows relative path", sanitizeUrl("about.html") === "about.html");
check("allows fragment", sanitizeUrl("#pricing") === "#pricing");

section("Rich text and plain text");
check("strips script tags", !sanitizeInlineHtml("<script>alert(1)</script>hi").includes("script"));
check("strips event handlers", !sanitizeInlineHtml('<b onclick="alert(1)">x</b>').includes("onclick"));
check("strips img onerror", !sanitizeInlineHtml('<img src=x onerror=alert(1)>').includes("onerror"));
check("keeps allowed inline tags", sanitizeInlineHtml("<strong>hi</strong>") === "<strong>hi</strong>");
check("drops disallowed tags", sanitizeInlineHtml("<iframe src=x></iframe>hi") === "hi");
check("stripTags removes markup", stripTags("<b>hello</b><script>x</script>") === "hello");

section("CSS values");
check("blocks expression()", sanitizeCssValue("expression(alert(1))") === "");
check("blocks url()", sanitizeCssValue("url(javascript:alert(1))") === "");
check("blocks @import", sanitizeCssValue("@import 'evil.css'") === "");
check("blocks brace escape", sanitizeCssValue("red}body{display:none") === "");
check("allows a plain value", sanitizeCssValue("48px") === "48px");
check("allows a hex colour", sanitizeColor("#2997ff") === "#2997ff");
check("rejects a bogus colour", sanitizeColor("red; background:url(x)") === "");
check(
  "style map drops unknown properties",
  Object.keys(sanitizeStyleMap({ position: "fixed", color: "#fff" })).join() === "color",
);
check(
  "style map drops hostile values",
  Object.keys(sanitizeStyleMap({ "background-image": "url(javascript:alert(1))" })).length === 0,
);

section("Post-login redirects (open redirect)");
check("blocks absolute URL", safeNextPath("https://evil.example/") === "/dashboard");
check("blocks protocol-relative", safeNextPath("//evil.example/") === "/dashboard");
check("blocks backslash trick", safeNextPath("/\\evil.example") === "/dashboard");
check("blocks javascript:", safeNextPath("javascript:alert(1)") === "/dashboard");
check("blocks control characters", safeNextPath("/dash\u0000board") === "/dashboard");
check("blocks api routes", safeNextPath("/api/projects/x/export") === "/dashboard");
check("allows a normal path", safeNextPath("/editor/abc123") === "/editor/abc123");
check("allows a path with query", safeNextPath("/templates?category=saas") === "/templates?category=saas");

section("Deployment names");
// Uppercase is normalised rather than refused — Cloudflare only accepts
// lowercase, and silently fixing the case is friendlier than an error.
const cased = validateProjectName("MySite");
check("lowercases rather than rejecting", cased.ok === true && cased.value === "mysite");
check("rejects too short", validateProjectName("ab").ok === false);
check("rejects double hyphen", validateProjectName("my--site").ok === false);
check("rejects leading hyphen", validateProjectName("-site").ok === false);
check("rejects reserved word", validateProjectName("admin").ok === false);
check("rejects html injection", validateProjectName("<script>").ok === false);
check("accepts a good name", validateProjectName("my-awesome-site").ok === true);

section("Upload sniffing (MIME cannot be trusted)");
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
const html = new TextEncoder().encode("<html><script>alert(1)</script></html>          ");
const svgSafe = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>');
const svgScript = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const svgHandler = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><rect onload="alert(1)"/></svg>');

check("detects a real PNG", sniffImage(png)?.mime === "image/png");
check("rejects HTML posing as an image", sniffImage(html) === null);
check("accepts a clean SVG", sniffImage(svgSafe)?.mime === "image/svg+xml");
check("rejects SVG containing script", sniffImage(svgScript) === null);
check("rejects SVG with an event handler", sniffImage(svgHandler) === null);

console.log(`\n${checks - failures}/${checks} checks passed.`);
if (failures) {
  console.error(`${failures} SECURITY CHECK(S) FAILED.`);
  process.exit(1);
}
