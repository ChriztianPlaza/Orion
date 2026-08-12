import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { env } from "@/lib/env";

/**
 * In development a missing AUTH_SECRET otherwise turns every session call into
 * an opaque 500. A fixed local-only value keeps `npm run dev` working on a
 * fresh clone while making the omission loud; production still refuses to boot
 * without a real secret.
 */
function resolveSecret(): string | undefined {
  if (env.AUTH_SECRET) return env.AUTH_SECRET;

  if (env.NODE_ENV === "production") {
    // Deliberately not thrown: `next build` runs with NODE_ENV=production and
    // must not depend on a runtime secret. Auth.js raises its own error on the
    // first request instead, which is where the misconfiguration matters.
    console.error(
      "[auth] AUTH_SECRET is not set. Generate one with `openssl rand -base64 32` and add it to the environment — authentication will fail until you do.",
    );
    return undefined;
  }

  console.warn(
    "[auth] AUTH_SECRET is not set — using an insecure development-only secret. Add AUTH_SECRET to .env.local.",
  );
  return "orion-development-only-secret-do-not-use-in-production";
}

/**
 * Edge-safe half of the auth setup. No Prisma, no bcrypt — this file is what
 * `middleware.ts` pulls in, and the edge runtime cannot load either.
 */
export const authConfig = {
  trustHost: true,
  secret: resolveSecret(),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/dashboard",
  },
  providers: [
    ...(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET
      ? [GitHub({ clientId: env.AUTH_GITHUB_ID, clientSecret: env.AUTH_GITHUB_SECRET, allowDangerousEmailAccountLinking: true })]
      : []),
    ...(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
      ? [Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET, allowDangerousEmailAccountLinking: true })]
      : []),
  ],
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;

export const oauthProviders = {
  github: Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET),
  google: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
};
