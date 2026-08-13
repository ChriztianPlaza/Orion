import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { clientIp, consumeRateLimit } from "@/lib/security/rate-limit";
import { authConfig } from "./config";
import type { Plan, Role } from "@prisma/client";

const credentialsSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

/** A real bcrypt hash of a random value, used only to equalise timing. */
const DUMMY_HASH = "$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

/**
 * Raised only once the password has already been checked and matched.
 *
 * Naming this reason is safe precisely because of that ordering: whoever sees
 * it has supplied working credentials, so it tells them nothing they could not
 * already establish. Every other failure — unknown address, wrong password —
 * stays indistinguishable, so the endpoint is still not an oracle for which
 * emails are registered.
 */
class UnverifiedEmailError extends CredentialsSignin {
  code = "unverified_email";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();

        // Two independent budgets: per account, so one target cannot be ground
        // down, and per source address, so an attacker cannot spray many
        // accounts from one host. Without this the credentials provider will
        // check passwords as fast as bcrypt can run.
        const ip = clientIp(new Headers(request?.headers ?? {}));
        const [byAccount, bySource] = await Promise.all([
          consumeRateLimit("auth.login", email),
          consumeRateLimit("auth.login.ip", ip),
        ]);
        if (!byAccount.ok || !bySource.ok) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) {
          // Spend comparable time on unknown accounts so response timing does
          // not reveal which addresses are registered.
          await bcrypt.compare(parsed.data.password, DUMMY_HASH);
          return null;
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        // The gate: an account whose address was never confirmed cannot sign
        // in. Checked here rather than in the UI so it cannot be skipped by
        // posting straight at the endpoint.
        if (!user.emailVerified) throw new UnverifiedEmailError();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    /**
     * Both OAuth providers run with `allowDangerousEmailAccountLinking`, so a
     * Google or GitHub sign-in attaches to an existing account with the same
     * address instead of failing with OAuthAccountNotLinked. That is only safe
     * while the provider has actually verified the address — otherwise anyone
     * who can create an account claiming someone else's email at that provider
     * could take over the local account. Google states verification explicitly,
     * so we require it; unverified sign-ins are refused.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const verified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
        if (verified === false) return false;
      }

      // OAuth providers have already proven the address, so mark it verified —
      // otherwise the credentials gate would strand anyone who later set a
      // password on a Google-created account.
      if (account?.provider && account.provider !== "credentials" && user?.id) {
        await prisma.user
          .updateMany({
            where: { id: user.id, emailVerified: null },
            data: { emailVerified: new Date() },
          })
          .catch(() => {});
      }

      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user?.id) token.sub = user.id;
      if (!token.sub) return token;

      // Refresh role/plan from the database on sign-in, on explicit session
      // update, and at most once a minute otherwise. Plan changes originate
      // from Stripe webhooks, so the JWT can never be the source of truth.
      const stale = !token.syncedAt || Date.now() - Number(token.syncedAt) > 60_000;
      if (user || trigger === "update" || stale) {
        const record = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, plan: true, name: true, image: true, email: true },
        });
        if (!record) return { ...token, sub: undefined };

        const isBootstrapAdmin =
          record.email && env.ADMIN_EMAILS.includes(record.email.toLowerCase());

        token.role = (isBootstrapAdmin ? "ADMIN" : record.role) as Role;
        token.plan = record.plan as Plan;
        token.name = record.name;
        token.picture = record.image;
        token.email = record.email;
        token.syncedAt = Date.now();

        if (isBootstrapAdmin && record.role !== "ADMIN") {
          await prisma.user
            .update({ where: { id: token.sub }, data: { role: "ADMIN" } })
            .catch(() => {});
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as Role) ?? "USER";
        session.user.plan = (token.plan as Plan) ?? "FREE";
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      await prisma.user
        .update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })
        .catch(() => {});
    },
  },
});

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
