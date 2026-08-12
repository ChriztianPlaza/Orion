/**
 * Runs a command with .env.local loaded.
 *
 *   node scripts/with-env.mjs prisma db push
 *
 * Next.js reads .env.local automatically, but the Prisma CLI and standalone
 * tsx scripts do not — they only look at .env. Without this, `db:push` fails
 * with "Environment variable not found: DIRECT_URL" even though the value is
 * sitting right there in .env.local. Rather than ask people to keep the same
 * secrets in two files, every database script goes through here.
 *
 * Precedence: real environment variables win, then .env.local, then .env.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function load(file) {
  const full = path.resolve(root, file);
  if (!fs.existsSync(full)) return 0;

  let count = 0;
  for (const raw of fs.readFileSync(full, "utf8").split("\n")) {
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

    // Anything already in the environment was set deliberately; leave it.
    if (process.env[key] !== undefined && process.env[key] !== "") continue;
    if (!value) continue;

    process.env[key] = value;
    count += 1;
  }
  return count;
}

load(".env.local");
load(".env");

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Usage: node scripts/with-env.mjs <command> [args…]");
  process.exit(1);
}

// `shell: true` is needed on Windows to run the .cmd shims npm installs for
// prisma and tsx. Node warns that arguments are concatenated rather than
// escaped; that is acceptable here because every argument comes from the
// scripts block in package.json, never from user input.
const child = spawn(command, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
