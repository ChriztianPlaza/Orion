import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * Drives sign-in over real HTTP against the running dev server, after the
 * next-auth upgrade. Going through the endpoints rather than importing
 * internals means this keeps working regardless of how the library arranges
 * its providers, and it exercises the CSRF and cookie handling that the
 * advisories touched.
 *
 * Requires `npm run dev` on :3000. Creates throwaway users and removes them.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = "TestPass123";
const PREFIX = "authcheck-";

type Jar = Map<string, string>;

function absorb(jar: Jar, response: Response) {
  for (const raw of response.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(";");
    const index = pair.indexOf("=");
    if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
}

const header = (jar: Jar) => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

async function attemptSignIn(email: string, password: string) {
  const jar: Jar = new Map();

  const csrfResponse = await fetch(`${BASE}/api/auth/csrf`);
  absorb(jar, csrfResponse);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const response = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: header(jar) },
    body: new URLSearchParams({ email, password, csrfToken, callbackUrl: `${BASE}/dashboard` }),
  });
  absorb(jar, response);

  const sessionCookie = [...jar.keys()].find((k) => k.includes("session-token"));
  const location = response.headers.get("location") ?? "";
  return {
    signedIn: Boolean(sessionCookie && jar.get(sessionCookie)),
    location: location.replace(BASE, ""),
  };
}

async function main() {
  const ping = await fetch(`${BASE}/api/auth/csrf`).catch(() => null);
  if (!ping?.ok) throw new Error(`dev server not reachable at ${BASE} — start it with npm run dev`);

  const hash = await bcrypt.hash(PASSWORD, 10);
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });

  await prisma.user.create({
    data: { email: `${PREFIX}ok@example.com`, passwordHash: hash, emailVerified: new Date(), name: "Verified" },
  });
  await prisma.user.create({
    data: { email: `${PREFIX}pending@example.com`, passwordHash: hash, emailVerified: null, name: "Unverified" },
  });

  const cases = [
    { label: "verified + right password", email: `${PREFIX}ok@example.com`, password: PASSWORD, expect: true },
    { label: "verified + wrong password", email: `${PREFIX}ok@example.com`, password: "WrongPass123", expect: false },
    { label: "unverified + right password", email: `${PREFIX}pending@example.com`, password: PASSWORD, expect: false },
    { label: "unknown address", email: `${PREFIX}nobody@example.com`, password: PASSWORD, expect: false },
    // The homoglyph advisory: a Cyrillic 'е' must not resolve to the ASCII account.
    { label: "homoglyph lookalike", email: `${PREFIX}оk@example.com`, password: PASSWORD, expect: false },
  ];

  let failures = 0;
  for (const c of cases) {
    const { signedIn, location } = await attemptSignIn(c.email, c.password);
    const pass = signedIn === c.expect;
    if (!pass) failures += 1;
    console.log(
      `  ${pass ? "PASS" : "FAIL"}  ${c.label.padEnd(28)} signedIn=${String(signedIn).padEnd(5)} -> ${location || "(no redirect)"}`,
    );
  }

  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  console.log(`\n${failures === 0 ? "every sign-in branch behaves correctly" : `${failures} FAILED`}`);
  if (failures) process.exitCode = 1;
}

main()
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } }).catch(() => {});
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
