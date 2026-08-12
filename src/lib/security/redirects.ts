/**
 * Post-login redirect targets.
 *
 * `?next=` is attacker-controllable — anyone can send a victim a link like
 * `/login?next=https://evil.example/`. Without this check the app would happily
 * bounce a freshly authenticated user off-site, which is a credible phishing
 * hand-off. Only same-site absolute paths are allowed through.
 */

const DEFAULT_PATH = "/dashboard";

export function safeNextPath(input: string | null | undefined, fallback = DEFAULT_PATH): string {
  if (!input) return fallback;

  const value = input.trim();
  if (!value.startsWith("/")) return fallback; // absolute URLs, mailto:, javascript:
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback; // protocol-relative
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback; // control characters
  if (value.length > 512) return fallback;

  // Never bounce back into an endpoint that returns a file or a redirect chain.
  if (value.startsWith("/api/")) return fallback;

  return value;
}
