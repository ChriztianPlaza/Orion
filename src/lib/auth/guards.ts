import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Plan, Role, User } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
  plan: Plan;
};

/** Session-only user. Cheap — no database round trip. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    role: session.user.role ?? "USER",
    plan: session.user.plan ?? "FREE",
  };
}

/** Authoritative user record. Use before any quota or authorization decision. */
export async function getDbUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fadmin");
  if (user.role !== "ADMIN") redirect("/dashboard?error=forbidden");
  return user;
}

/** API-route variants: return a Response instead of redirecting. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
  toResponse() {
    return Response.json({ error: this.code, message: this.message }, { status: this.status });
  }
}

export async function requireApiUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "unauthorized", "You must be signed in.");
  return user;
}

export async function requireApiAdmin(): Promise<SessionUser> {
  const user = await requireApiUser();
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "forbidden", "Administrator access required.");
  }
  return user;
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) return error.toResponse();
  console.error("[api]", error);
  return Response.json(
    { error: "internal_error", message: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
