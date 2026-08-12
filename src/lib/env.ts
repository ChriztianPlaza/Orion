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

  CLOUDFLARE_API_TOKEN: read("CLOUDFLARE_API_TOKEN"),
  CLOUDFLARE_ACCOUNT_ID: read("CLOUDFLARE_ACCOUNT_ID"),
  CLOUDFLARE_PAGES_DOMAIN: read("CLOUDFLARE_PAGES_DOMAIN") ?? "pages.dev",

  BLOB_READ_WRITE_TOKEN: read("BLOB_READ_WRITE_TOKEN"),

  GITHUB_TOKEN: read("GITHUB_TOKEN"),

  ADMIN_EMAILS: (read("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
} as const;

export function appUrl(): string {
  return (
    read("NEXT_PUBLIC_APP_URL") ??
    env.AUTH_URL ??
    (read("VERCEL_PROJECT_PRODUCTION_URL")
      ? `https://${read("VERCEL_PROJECT_PRODUCTION_URL")}`
      : undefined) ??
    (read("VERCEL_URL") ? `https://${read("VERCEL_URL")}` : undefined) ??
    "http://localhost:3000"
  );
}

export const isStripeConfigured = () =>
  Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_ID);

export const isCloudflareConfigured = () =>
  Boolean(env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID);

export const isBlobConfigured = () => Boolean(env.BLOB_READ_WRITE_TOKEN);

export const isDatabaseConfigured = () => Boolean(env.DATABASE_URL);
