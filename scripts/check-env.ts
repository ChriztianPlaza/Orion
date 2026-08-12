/**
 * Tells you what is missing from .env.local, in plain language, and tries a
 * real connection to the database.
 *
 *   npm run check:env
 *
 * Exists because "it doesn't work" is almost always one unfilled value, and the
 * underlying tools report that as a stack trace about a host named "host".
 */

import fs from "node:fs";
import path from "node:path";

const ENV_PATH = path.resolve(process.cwd(), ".env.local");

type Status = "ok" | "empty" | "placeholder" | "missing";

function readEnvFile(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) return {};

  const out: Record<string, string> = {};
  for (const raw of fs.readFileSync(ENV_PATH, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const PLACEHOLDERS = ["user:password@host", "your-domain", "....apps.googleusercontent.com"];

function statusOf(value: string | undefined): Status {
  if (value === undefined) return "missing";
  if (!value) return "empty";
  if (PLACEHOLDERS.some((p) => value.includes(p))) return "placeholder";
  return "ok";
}

const LABEL: Record<Status, string> = {
  ok: "OK       ",
  empty: "EMPTY    ",
  placeholder: "NOT FILLED",
  missing: "MISSING  ",
};

async function main() {
  console.log(`\nReading ${ENV_PATH}\n`);

  if (!fs.existsSync(ENV_PATH)) {
    console.log("There is no .env.local file. Create one by copying .env.example:\n");
    console.log("  cp .env.example .env.local\n");
    process.exit(1);
  }

  const env = readEnvFile();

  const required = ["DATABASE_URL", "DIRECT_URL", "AUTH_SECRET"] as const;
  const optional = [
    ["STRIPE_SECRET_KEY", "Pro plan checkout"],
    ["STRIPE_PRICE_ID", "Pro plan checkout"],
    ["STRIPE_WEBHOOK_SECRET", "Pro plan activation"],
    ["AUTH_GOOGLE_ID", "Sign in with Google"],
    ["AUTH_GOOGLE_SECRET", "Sign in with Google"],
    ["BLOB_READ_WRITE_TOKEN", "Image uploads"],
    ["CLOUDFLARE_API_TOKEN", "One-click deployment"],
    ["CLOUDFLARE_ACCOUNT_ID", "One-click deployment"],
  ] as const;

  console.log("REQUIRED");
  let blocked = false;
  for (const key of required) {
    const status = statusOf(env[key]);
    if (status !== "ok") blocked = true;
    console.log(`  ${LABEL[status]}  ${key}`);
  }

  console.log("\nOPTIONAL (the feature is simply switched off until set)");
  for (const [key, feature] of optional) {
    const status = statusOf(env[key]);
    console.log(`  ${LABEL[status]}  ${key.padEnd(22)} ${feature}`);
  }

  if (blocked) {
    console.log("\n──────────────────────────────────────────────────────────────");
    console.log("WHAT TO DO NEXT\n");
    for (const key of required) {
      const status = statusOf(env[key]);
      if (status === "ok") continue;

      if (key === "AUTH_SECRET") {
        console.log(`  ${key} is ${status}. Generate one and paste it in:`);
        console.log(`    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"\n`);
      } else {
        console.log(`  ${key} is ${status}.`);
        console.log("    Sign in at https://neon.tech, open your project, and copy the");
        console.log("    connection string. It looks like:");
        console.log("    postgresql://neondb_owner:AbC123@ep-cool-name.eu-central-1.aws.neon.tech/neondb?sslmode=require\n");
      }
    }
    console.log("Open the file with:  notepad .env.local");
    console.log("Then run this check again:  npm run check:env\n");
    process.exit(1);
  }

  // Shape check before we bother the network.
  try {
    const url = new URL(env.DATABASE_URL!);
    if (!url.username || !url.password) {
      console.log("\nDATABASE_URL has no username or password. Copy the full string from Neon.");
      process.exit(1);
    }
    if (!env.DATABASE_URL!.includes("sslmode")) {
      console.log("\nNote: DATABASE_URL has no ?sslmode=require — Neon normally needs it.");
    }
  } catch {
    console.log("\nDATABASE_URL is not a valid URL. It must start with postgresql://");
    process.exit(1);
  }

  console.log("\nTrying to reach the database…");
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.DIRECT_URL = env.DIRECT_URL;

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ log: [] });

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Connected.\n");

    try {
      const templates = await prisma.template.count();
      const users = await prisma.user.count();
      console.log(`Tables exist. ${templates} templates, ${users} users.`);
      console.log(
        templates === 0
          ? "\nNext: npm run db:seed   (loads the 102 templates)\n"
          : "\nEverything is ready. Next: npm run dev\n",
      );
    } catch {
      console.log("Connected, but the tables do not exist yet.");
      console.log("\nNext: npm run db:push   (creates them)\n");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log("Could not connect.\n");
    if (/ENOTFOUND|getaddrinfo/i.test(message)) {
      console.log("  The server name does not exist. The connection string is wrong or incomplete.");
    } else if (/password authentication|SASL|auth/i.test(message)) {
      console.log("  The username or password is wrong. Copy the string from Neon again.");
    } else if (/timeout|ETIMEDOUT/i.test(message)) {
      console.log("  Timed out. Check your internet connection or a firewall.");
    } else {
      console.log(`  ${message.split("\n")[0]}`);
    }
    console.log("");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
