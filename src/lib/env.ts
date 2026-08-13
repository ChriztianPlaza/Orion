/**
 * Server-only environment access.
 *
 * Every integration is *optional at build time* so the app still builds and
 * boots on Vercel before the operator has filled in every key. Features gate
 * themselves at runtime via the `is*Configured()` helpers and surface a clear
 * "configuration required" state in the UI instead of crashing.
 */

function read(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",

  DATABASE_URL: read("DATABASE_URL"),
  DIRECT_URL: read("DIRECT_URL"),

  AUTH_SECRET: read("AUTH_SECRET") ?? read("NEXTAUTH_SECRET"),
  AUTH_URL: read("AUTH_URL") ?? read("NEXTAUTH_URL"),
  AUTH_GITHUB_ID: read("AUTH_GITHUB_ID"),
  AUTH_GITHUB_SECRET: read("AUTH_GITHUB_SECRET"),
  AUTH_GOOGLE_ID: read("AUTH_GOOGLE_ID"),
  AUTH_GOOGLE_SECRET: read("AUTH_GOOGLE_SECRET"),

  STRIPE_SECRET_KEY: read("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: read("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRICE_ID: read("STRIPE_PRICE_ID"),

  BLOB_READ_WRITE_TOKEN: read("BLOB_READ_WRITE_TOKEN"),

  GITHUB_TOKEN: read("GITHUB_TOKEN"),

  ADMIN_EMAILS: (read("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
} as const;

/**
 * Normalises a configured origin.
 *
 * `NEXT_PUBLIC_APP_URL` is typed by hand into a dashboard, so it arrives
 * without a scheme often enough to matter — and a bare host fails `new URL()`,
 * which took down a production build at "Collecting page data" with nothing
 * but `ERR_INVALID_URL` to go on. Assume https, drop any trailing slash, and
 * refuse anything still unparseable rather than propagate it.
 */
function normalizeOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return undefined;
  }
}

export function appUrl(): string {
  return (
    normalizeOrigin(read("NEXT_PUBLIC_APP_URL")) ??
    normalizeOrigin(env.AUTH_URL) ??
    normalizeOrigin(read("VERCEL_PROJECT_PRODUCTION_URL")) ??
    normalizeOrigin(read("VERCEL_URL")) ??
    "http://localhost:3000"
  );
}

export const isStripeConfigured = () =>
  Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_ID);

export const isBlobConfigured = () => Boolean(env.BLOB_READ_WRITE_TOKEN);

export const isDatabaseConfigured = () => Boolean(env.DATABASE_URL);
