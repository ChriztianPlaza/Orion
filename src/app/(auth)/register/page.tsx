import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/guards";
import { AuthForm } from "@/components/auth/auth-form";
import { oauthProviders } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a free Orion account and build your first website.",
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <Suspense>
      <AuthForm mode="register" providers={oauthProviders} />
    </Suspense>
  );
}
